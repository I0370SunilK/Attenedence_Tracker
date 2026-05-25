package attendance.example.backend.service;

import attendance.example.backend.dto.AttendanceImportPreviewRow;
import attendance.example.backend.dto.AttendanceImportResult;
import attendance.example.backend.dto.SignupRequest;
import attendance.example.backend.model.AttendanceRecord;
import attendance.example.backend.model.Employee;
import attendance.example.backend.util.PasswordEncoder;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.bson.Document;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ExcelImportService {

    private static final Set<String> ALLOWED_STATUSES = Set.of("WFO", "WFH", "CLT", "PTO", "HOL");
    private static final int DATE_HEADER_START_COLUMN = 4; // column E in Excel
    private static final int EMPLOYEE_ID_COLUMN = 1; // column B
    private static final int EMPLOYEE_NAME_COLUMN = 2; // column C
    private static final int PROJECT_TEAM_COLUMN = 3; // column D
    private static final int FIRST_DATA_ROW_INDEX = 2; // row 3 in Excel
    private static final int PREVIEW_LIMIT = 100;
    private static final DateTimeFormatter[] DATE_FORMATTERS = new DateTimeFormatter[]{
            DateTimeFormatter.ofPattern("yyyy-MM-dd").withResolverStyle(ResolverStyle.SMART),
            DateTimeFormatter.ofPattern("dd/MM/yyyy").withResolverStyle(ResolverStyle.SMART),
            DateTimeFormatter.ofPattern("MM/dd/yyyy").withResolverStyle(ResolverStyle.SMART),
            DateTimeFormatter.ofPattern("dd-MM-yyyy").withResolverStyle(ResolverStyle.SMART),
            DateTimeFormatter.ofPattern("d-MMM-yy", Locale.ENGLISH).withResolverStyle(ResolverStyle.SMART),
            DateTimeFormatter.ofPattern("d-MMM-yyyy", Locale.ENGLISH).withResolverStyle(ResolverStyle.SMART),
            DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH).withResolverStyle(ResolverStyle.SMART),
            DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH).withResolverStyle(ResolverStyle.SMART)
    };

    private final EmployeeService employeeService;
    private final AttendanceService attendanceService;

    public ExcelImportService(EmployeeService employeeService, AttendanceService attendanceService) {
        this.employeeService = employeeService;
        this.attendanceService = attendanceService;
    }

    public AttendanceImportResult importExcel(MultipartFile file, int month, int year, String mode) throws Exception {
        long start = System.currentTimeMillis();
        AttendanceImportResult result = new AttendanceImportResult();
        result.setMode(mode == null ? "preview" : mode.toLowerCase());
        result.setMonth(month);
        result.setYear(year);

        validateMonthYear(month, year);
        ParsedAttendanceSheet parsed = parseAttendanceFile(file, month, year, result);

        if (!parsed.errors().isEmpty()) {
            result.setErrors(parsed.errors());
            result.setSuccess(false);
            result.setProcessingTimeMs(System.currentTimeMillis() - start);
            result.setSummary("Validation failed");
            return result;
        }

        List<Employee> existingEmployees = employeeService.findByEmployeeIds(parsed.employeeIds());
        Map<String, Employee> employeeMap = mapByBusinessId(existingEmployees);
        Map<String, Map<String, AttendanceRecord>> existingLookup = attendanceService.loadAttendanceLookupForEmployeeKeys(parsed.employeeIds(), month, year);

        buildPreview(parsed, employeeMap, existingLookup, result);

        if (mode == null || mode.equalsIgnoreCase("preview") || mode.equalsIgnoreCase("dry-run")) {
            result.setSuccess(result.getErrors().isEmpty());
            result.setProcessingTimeMs(System.currentTimeMillis() - start);
            return result;
        }

        performImport(parsed, employeeMap, existingLookup, result, mode.equalsIgnoreCase("replace-month"));
        result.setSuccess(result.getErrors().isEmpty());
        result.setProcessingTimeMs(System.currentTimeMillis() - start);
        return result;
    }

    private void validateMonthYear(int month, int year) {
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("Month must be between 1 and 12");
        }
        if (year < 2000 || year > LocalDate.now().getYear() + 2) {
            throw new IllegalArgumentException("Year must be between 2000 and " + (LocalDate.now().getYear() + 2));
        }
    }

    private ParsedAttendanceSheet parseAttendanceFile(MultipartFile file, int targetMonth, int targetYear, AttendanceImportResult result) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Select a file before importing");
        }

        List<String> errors = new ArrayList<>();
        List<AttendanceImportRow> rows = new ArrayList<>();
        Sheet sheet;

        try (InputStream inputStream = file.getInputStream(); Workbook workbook = WorkbookFactory.create(inputStream)) {
            sheet = locateAttendanceSheet(workbook);
            if (sheet == null) {
                errors.add("Excel sheet named 'Attendence Tracking' or first sheet is required");
                return new ParsedAttendanceSheet(List.of(), List.of(), errors);
            }

            Row dateHeader = sheet.getRow(0);
            if (dateHeader == null) {
                errors.add("Date header row is missing");
                return new ParsedAttendanceSheet(List.of(), List.of(), errors);
            }

            Map<Integer, LocalDate> dateColumns = parseDateColumns(dateHeader, errors);
            if (dateColumns.isEmpty()) {
                errors.add("No valid attendance date columns found starting from column E");
                return new ParsedAttendanceSheet(List.of(), List.of(), errors);
            }

            Map<Integer, LocalDate> selectedDateColumns = filterMonthYearColumns(dateColumns, targetMonth, targetYear);
            if (selectedDateColumns.isEmpty()) {
                errors.add("No attendance columns found for " + YearMonth.of(targetYear, targetMonth).toString());
                return new ParsedAttendanceSheet(List.of(), List.of(), errors);
            }

            Set<String> seenEmployees = new HashSet<>();
            int first = sheet.getFirstRowNum();
            int last = sheet.getLastRowNum();
            for (int rowIndex = FIRST_DATA_ROW_INDEX; rowIndex <= last; rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) {
                    continue;
                }

                String employeeId = clean(getCellValue(row, EMPLOYEE_ID_COLUMN));
                String fullName = clean(getCellValue(row, EMPLOYEE_NAME_COLUMN));
                String projectTeam = clean(getCellValue(row, PROJECT_TEAM_COLUMN));

                if (employeeId.isBlank() && fullName.isBlank() && projectTeam.isBlank() && rowIsEmpty(row, selectedDateColumns.keySet())) {
                    continue;
                }
                if (employeeId.isBlank()) {
                    errors.add("Row " + (rowIndex + 1) + ": Employee ID is required");
                    continue;
                }
                if (fullName.isBlank()) {
                    errors.add("Row " + (rowIndex + 1) + ": Employee Name is required");
                }
                if (seenEmployees.contains(employeeId)) {
                    errors.add("Row " + (rowIndex + 1) + ": Duplicate Employee ID '" + employeeId + "'");
                    continue;
                }
                seenEmployees.add(employeeId);

                Map<String, String> attendanceByDate = new LinkedHashMap<>();
                for (Map.Entry<Integer, LocalDate> dateColumn : selectedDateColumns.entrySet()) {
                    String rawValue = clean(getCellValue(row, dateColumn.getKey()));
                    if (rawValue.isBlank()) {
                        continue;
                    }
                    String status = rawValue.toUpperCase(Locale.ROOT);
                    if (!ALLOWED_STATUSES.contains(status)) {
                        errors.add("Row " + (rowIndex + 1) + ", Column " + (dateColumn.getKey() + 1) + ": Invalid attendance code '" + rawValue + "'");
                        continue;
                    }
                    attendanceByDate.put(dateColumn.getValue().toString(), status);
                }

                rows.add(new AttendanceImportRow(rowIndex + 1, employeeId, fullName, projectTeam, attendanceByDate));
            }
        } catch (IOException exception) {
            throw exception;
        } catch (Exception exception) {
            errors.add("Unable to parse attendance Excel file: " + exception.getMessage());
        }

        List<String> employeeIds = new ArrayList<>();
        for (AttendanceImportRow row : rows) {
            if (!employeeIds.contains(row.employeeId())) {
                employeeIds.add(row.employeeId());
            }
        }
        return new ParsedAttendanceSheet(rows, employeeIds, errors);
    }

    private Sheet locateAttendanceSheet(Workbook workbook) {
        Sheet sheet = workbook.getSheet("Attendence Tracking");
        if (sheet != null) {
            return sheet;
        }
        return workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
    }

    private Map<Integer, LocalDate> parseDateColumns(Row dateHeader, List<String> errors) {
        Map<Integer, LocalDate> columns = new LinkedHashMap<>();
        Set<LocalDate> seenDates = new HashSet<>();

        int last = dateHeader.getLastCellNum();
        for (int colIndex = DATE_HEADER_START_COLUMN; colIndex < last; colIndex++) {
            String raw = clean(getCellValue(dateHeader, colIndex));
            if (raw.isBlank()) {
                continue;
            }
            LocalDate parsed = parseDate(raw);
            if (parsed == null) {
                errors.add("Invalid date header at column " + (colIndex + 1) + ": '" + raw + "'");
                continue;
            }
            if (seenDates.contains(parsed)) {
                errors.add("Duplicate attendance date column found for " + parsed + " at column " + (colIndex + 1));
                continue;
            }
            seenDates.add(parsed);
            columns.put(colIndex, parsed);
        }
        return columns;
    }

    private Map<Integer, LocalDate> filterMonthYearColumns(Map<Integer, LocalDate> dateColumns, int month, int year) {
        Map<Integer, LocalDate> filtered = new LinkedHashMap<>();
        for (Map.Entry<Integer, LocalDate> entry : dateColumns.entrySet()) {
            LocalDate date = entry.getValue();
            if (date.getMonthValue() == month && date.getYear() == year) {
                filtered.put(entry.getKey(), date);
            }
        }
        return filtered;
    }

    private boolean rowIsEmpty(Row row, Set<Integer> columns) {
        for (Integer colIndex : columns) {
            if (!clean(getCellValue(row, colIndex)).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private void buildPreview(ParsedAttendanceSheet parsed, Map<String, Employee> employeeMap,
                              Map<String, Map<String, AttendanceRecord>> existingLookup,
                              AttendanceImportResult result) {
        List<AttendanceImportPreviewRow> previewRows = new ArrayList<>();
        int totalCells = 0;
        int newCount = 0;
        int updateCount = 0;
        int sameCount = 0;
        int invalidCount = 0;
        int skippedCount = 0;

        for (AttendanceImportRow row : parsed.rows()) {
            boolean rowExists = employeeMap.containsKey(row.employeeId());
            String employeeKey = row.employeeId();
            for (Map.Entry<String, String> cell : row.attendanceByDate().entrySet()) {
                totalCells++;
                String date = cell.getKey();
                String excelValue = cell.getValue();
                String existingValue = lookupExistingValue(existingLookup, employeeMap, employeeKey, date);
                String action;
                if (existingValue == null) {
                    action = "NEW";
                    newCount++;
                } else if (existingValue.equalsIgnoreCase(excelValue)) {
                    action = "SAME";
                    sameCount++;
                } else {
                    action = "UPDATE";
                    updateCount++;
                }
                if (previewRows.size() < PREVIEW_LIMIT) {
                    AttendanceImportPreviewRow previewRow = new AttendanceImportPreviewRow();
                    previewRow.setRowNumber(row.sourceRowNumber());
                    previewRow.setEmployeeId(row.employeeId());
                    previewRow.setEmployeeName(row.employeeName());
                    previewRow.setProjectTeam(row.projectTeam());
                    previewRow.setDate(date);
                    previewRow.setExistingValue(existingValue == null ? "No existing record" : existingValue);
                    previewRow.setExcelValue(excelValue);
                    previewRow.setAction(action);
                    previewRows.add(previewRow);
                }
            }
        }

        result.setTotalEmployeesProcessed(parsed.employeeIds().size());
        result.setTotalAttendanceCells(totalCells);
        result.setNewRecords(newCount);
        result.setUpdatedRecords(updateCount);
        result.setSameRecords(sameCount);
        result.setSkippedRecords(skippedCount);
        result.setInvalidRecords(invalidCount);
        result.setPreviewRows(previewRows.size() > PREVIEW_LIMIT ? previewRows.subList(0, PREVIEW_LIMIT) : previewRows);
        result.setErrors(parsed.errors());
        result.setSummary("Parsed " + totalCells + " attendance cells across " + parsed.employeeIds().size() + " employees.");
    }

    private String lookupExistingValue(Map<String, Map<String, AttendanceRecord>> existingLookup,
                                       Map<String, Employee> employeeMap,
                                       String employeeKey,
                                       String date) {
        Employee employee = employeeMap.get(employeeKey);
        if (employee == null) {
            return null;
        }
        Map<String, AttendanceRecord> byDate = existingLookup.get(employee.getId());
        if (byDate != null && byDate.containsKey(date)) {
            return byDate.get(date).getStatus();
        }
        byDate = existingLookup.get(employee.getEmployeeId());
        if (byDate != null && byDate.containsKey(date)) {
            return byDate.get(date).getStatus();
        }
        return null;
    }

    private void performImport(ParsedAttendanceSheet parsed,
                               Map<String, Employee> employeeMap,
                               Map<String, Map<String, AttendanceRecord>> existingLookup,
                               AttendanceImportResult result,
                               boolean forceReplaceMonth) throws Exception {
        List<AttendanceRecord> upsertRecords = new ArrayList<>();
        int newCount = 0;
        int updateCount = 0;
        int sameCount = 0;
        int skippedCount = 0;
        int failedCount = 0;

        for (AttendanceImportRow row : parsed.rows()) {
            Employee employee = employeeMap.get(row.employeeId());
            if (employee == null) {
                String defaultEmail = row.employeeId().toLowerCase(Locale.ROOT) + "@import.local";
                employee = employeeService.upsertImportedEmployee(
                        defaultEmail,
                        row.employeeName(),
                        "Employee",
                        row.employeeId(),
                        row.projectTeam()
                ).employee();
                employeeMap.put(row.employeeId(), employee);
            }

            Map<String, AttendanceRecord> byDate = existingLookup.get(employee.getId());
            if (byDate == null) {
                byDate = existingLookup.get(employee.getEmployeeId());
            }
            if (byDate == null) {
                byDate = new HashMap<>();
            }

            for (Map.Entry<String, String> cell : row.attendanceByDate().entrySet()) {
                String date = cell.getKey();
                String excelValue = cell.getValue();
                String existingValue = byDate.containsKey(date) ? byDate.get(date).getStatus() : null;
                if (existingValue != null && existingValue.equalsIgnoreCase(excelValue)) {
                    sameCount++;
                    skippedCount++;
                    continue;
                }

                AttendanceRecord record = new AttendanceRecord();
                record.setId(employee.getId() + ":" + date);
                record.setEmployeeId(employee.getId());
                record.setDate(date);
                record.setStatus(excelValue);
                record.setMarkedAt(Instant.now().toString());
                record.setEdited(false);
                upsertRecords.add(record);

                if (existingValue == null) {
                    newCount++;
                } else {
                    updateCount++;
                }
            }
        }

        try {
            attendanceService.bulkUpsertAttendanceRecords(upsertRecords, false);
        } catch (Exception exception) {
            failedCount = upsertRecords.size();
            result.getErrors().add("Bulk attendance write failed: " + exception.getMessage());
        }

        result.setNewRecords(newCount);
        result.setUpdatedRecords(updateCount);
        result.setSameRecords(sameCount);
        result.setSkippedRecords(skippedCount);
        result.setFailedRecords(failedCount);
        result.setSummary("Imported " + newCount + " new records, updated " + updateCount + ", skipped " + sameCount + ".");
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String getCellValue(Row row, int columnIndex) {
        if (row == null) {
            return "";
        }
        Cell cell = row.getCell(columnIndex, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) {
            return "";
        }
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalDate().toString();
        }
        DataFormatter formatter = new DataFormatter();
        return formatter.formatCellValue(cell);
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) {
            return null;
        }
        String normalized = dateStr.trim();
        if (normalized.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return LocalDate.parse(normalized);
        }
        for (DateTimeFormatter formatter : DATE_FORMATTERS) {
            try {
                LocalDate parsed = LocalDate.parse(normalized, formatter);
                if (parsed.getYear() >= 0 && parsed.getYear() < 100) {
                    parsed = parsed.withYear(parsed.getYear() + 2000);
                }
                return parsed;
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    private Map<String, Employee> mapByBusinessId(List<Employee> employees) {
        Map<String, Employee> map = new HashMap<>();
        for (Employee employee : employees) {
            if (employee.getEmployeeId() != null) {
                map.put(employee.getEmployeeId(), employee);
            }
        }
        return map;
    }

    private record ParsedAttendanceSheet(
            List<AttendanceImportRow> rows,
            List<String> employeeIds,
            List<String> errors
    ) {}

    private record AttendanceImportRow(
            int sourceRowNumber,
            String employeeId,
            String employeeName,
            String projectTeam,
            Map<String, String> attendanceByDate
    ) {}
}
