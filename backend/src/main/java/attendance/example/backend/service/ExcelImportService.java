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
import java.util.regex.Pattern;

@Service
public class ExcelImportService {

    // Allow both standard codes and common variants like CL (Casual Leave), WHO
    private static final Set<String> ALLOWED_STATUSES = Set.of("WFO", "WFH", "CLT", "PTO", "HOL", "CL", "WHO");
    // Column layout for the attendance Excel sheet:
    // A(0)=SL No, B(1)=Employee ID, C(2)=Employee Name, D(3)=Project Team, E(4)=Email, F(5)+ = dates
    private static final int DATE_HEADER_START_COLUMN = 5; // column F in Excel
    private static final int SL_NO_COLUMN = 0;              // column A
    private static final int EMPLOYEE_ID_COLUMN = 1;        // column B
    private static final int EMPLOYEE_NAME_COLUMN = 2;      // column C
    private static final int PROJECT_TEAM_COLUMN = 3;       // column D
    private static final int EMAIL_COLUMN = 4;               // column E
    private static final int PREVIEW_LIMIT = 100;
    private static final Set<String> WEEKDAY_LABELS = Set.of(
            "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN",
            "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"
    );
    private static final Pattern DAY_NUMBER_PATTERN = Pattern.compile("^\\d{1,2}$");
    private static final Pattern DAY_MONTH_PATTERN = Pattern.compile("^(\\d{1,2})\\s*(?:[-/])\\s*([a-zA-Z]{3,})$", Pattern.CASE_INSENSITIVE);
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

            Row dateHeader = findDateHeaderRow(sheet, errors, targetMonth, targetYear);
            if (dateHeader == null) {
                errors.add("Date header row (dates starting from column F) is missing");
                return new ParsedAttendanceSheet(List.of(), List.of(), errors);
            }

            Map<Integer, LocalDate> dateColumns = parseDateColumns(dateHeader, errors, targetMonth, targetYear);
            if (dateColumns.isEmpty()) {
                errors.add("No valid attendance date columns found starting from column F");
                return new ParsedAttendanceSheet(List.of(), List.of(), errors);
            }

            Map<Integer, LocalDate> selectedDateColumns = filterMonthYearColumns(dateColumns, targetMonth, targetYear);
            if (selectedDateColumns.isEmpty()) {
                errors.add("No attendance columns found for " + YearMonth.of(targetYear, targetMonth).toString());
                return new ParsedAttendanceSheet(List.of(), List.of(), errors);
            }

            int firstDataRowIndex = dateHeader.getRowNum() + 1;
            Row nextRow = sheet.getRow(firstDataRowIndex);
            if (isWeekdayRow(nextRow, selectedDateColumns.keySet())) {
                firstDataRowIndex++;
            }

            Set<String> seenEmployees = new HashSet<>();
            int last = sheet.getLastRowNum();
            for (int rowIndex = firstDataRowIndex; rowIndex <= last; rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) {
                    continue;
                }

                // Check row for emptiness - skip if it's a blank or weekday label row
                String slNo = clean(getCellValue(row, SL_NO_COLUMN));
                String employeeId = clean(getCellValue(row, EMPLOYEE_ID_COLUMN));
                String fullName = clean(getCellValue(row, EMPLOYEE_NAME_COLUMN));
                String projectTeam = clean(getCellValue(row, PROJECT_TEAM_COLUMN));
                String email = clean(getCellValue(row, EMAIL_COLUMN));

                // Skip rows that are entirely empty or only have weekday labels in date columns
                if (employeeId.isBlank() && fullName.isBlank() && email.isBlank()
                        && (rowIsEmpty(row, selectedDateColumns.keySet()) || rowHasOnlyWeekdayLabels(row, selectedDateColumns.keySet()))) {
                    continue;
                }

                // Employee ID is required; if missing try matching by email
                if (employeeId.isBlank()) {
                    if (!email.isBlank()) {
                        // Search for employee by email
                        try {
                            List<Employee> allEmps = employeeService.getEmployees();
                            for (Employee emp : allEmps) {
                                if (email.equalsIgnoreCase(emp.getEmail())) {
                                    employeeId = emp.getEmployeeId();
                                    break;
                                }
                            }
                        } catch (Exception ignored) {}
                    }
                    if (employeeId.isBlank()) {
                        errors.add("Row " + (rowIndex + 1) + ": Employee ID is required (looked up by email as well)");
                        continue;
                    }
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

                rows.add(new AttendanceImportRow(rowIndex + 1, employeeId, fullName, projectTeam, email, attendanceByDate));
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

    private Map<Integer, LocalDate> parseDateColumns(Row dateHeader, List<String> errors, int targetMonth, int targetYear) {
        Map<Integer, LocalDate> columns = new LinkedHashMap<>();
        Set<LocalDate> seenDates = new HashSet<>();

        int last = dateHeader.getLastCellNum();
        for (int colIndex = DATE_HEADER_START_COLUMN; colIndex < last; colIndex++) {
            String raw = getCellRawValue(dateHeader, colIndex);
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String cleaned = clean(raw);
            
            LocalDate parsed = parseDate(cleaned);
            
            // If standard date parsing failed, try to interpret as a day number (1-31)
            if (parsed == null && DAY_NUMBER_PATTERN.matcher(cleaned).matches()) {
                int day = Integer.parseInt(cleaned);
                if (day >= 1 && day <= 31) {
                    try {
                        parsed = LocalDate.of(targetYear, targetMonth, day);
                    } catch (Exception ignored) {}
                }
            }
            
            // If still null, try pattern like "1-Jan" or "01-Jan" (without year)
            if (parsed == null) {
                java.util.regex.Matcher matcher = DAY_MONTH_PATTERN.matcher(cleaned.trim());
                if (matcher.matches()) {
                    try {
                        int day = Integer.parseInt(matcher.group(1));
                        String monthAbbr = matcher.group(2).toUpperCase(Locale.ROOT);
                        parsed = tryParseDayMonth(day, monthAbbr, targetMonth, targetYear);
                    } catch (Exception ignored) {
                        // fall through
                    }
                }
            }
            
            if (parsed == null) {
                // Only add error if this doesn't look like a weekday row header
                if (!WEEKDAY_LABELS.contains(cleaned.toUpperCase(Locale.ROOT))) {
                    errors.add("Invalid date header at column " + (colIndex + 1) + ": '" + cleaned + "'");
                }
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

    private LocalDate tryParseDayMonth(int day, String monthAbbr, int targetMonth, int targetYear) {
        String shortTarget = YearMonth.of(targetYear, targetMonth).getMonth().getDisplayName(
                java.time.format.TextStyle.SHORT, Locale.ENGLISH).toUpperCase(Locale.ROOT);
        String fullTarget = YearMonth.of(targetYear, targetMonth).getMonth().getDisplayName(
                java.time.format.TextStyle.FULL, Locale.ENGLISH).toUpperCase(Locale.ROOT);
        
        if (monthAbbr.equals(shortTarget) || monthAbbr.equals(fullTarget)) {
            try {
                return LocalDate.of(targetYear, targetMonth, day);
            } catch (Exception ignored) {}
        }
        
        for (int m = 1; m <= 12; m++) {
            String fullName = YearMonth.of(targetYear, m).getMonth().getDisplayName(
                    java.time.format.TextStyle.FULL, Locale.ENGLISH).toUpperCase(Locale.ROOT);
            String shortName = fullName.substring(0, 3);
            if (monthAbbr.equals(shortName) || monthAbbr.equals(fullName)) {
                try {
                    return LocalDate.of(targetYear, m, day);
                } catch (Exception ignored) {}
            }
        }
        return null;
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

    private Row findDateHeaderRow(Sheet sheet, List<String> errors, int targetMonth, int targetYear) {
        int firstRow = sheet.getFirstRowNum();
        int lastRow = Math.min(sheet.getLastRowNum(), firstRow + 5);
        for (int rowIndex = firstRow; rowIndex <= lastRow; rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row == null) {
                continue;
            }
            Map<Integer, LocalDate> candidate = parseDateColumns(row, new ArrayList<>(), targetMonth, targetYear);
            if (!candidate.isEmpty()) {
                return row;
            }
        }
        return null;
    }

    private boolean isWeekdayRow(Row row, Set<Integer> columns) {
        if (row == null || columns == null || columns.isEmpty()) {
            return false;
        }
        boolean foundNonBlank = false;
        for (Integer colIndex : columns) {
            String value = clean(getCellValue(row, colIndex)).toUpperCase(Locale.ROOT);
            if (value.isBlank()) {
                continue;
            }
            foundNonBlank = true;
            if (ALLOWED_STATUSES.contains(value) || WEEKDAY_LABELS.contains(value)) {
                // It's a weekday label if it matches a known weekday name
                if (WEEKDAY_LABELS.contains(value)) {
                    continue;
                }
                return false; // it's an attendance status, not a weekday
            }
            if (!WEEKDAY_LABELS.contains(value)) {
                return false;
            }
        }
        return foundNonBlank;
    }

    private boolean rowHasOnlyWeekdayLabels(Row row, Set<Integer> columns) {
        return isWeekdayRow(row, columns);
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
                String email = row.email().isBlank() ? row.employeeId().toLowerCase(Locale.ROOT) + "@import.local" : row.email();
                employee = employeeService.upsertImportedEmployee(
                        email,
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

                // Normalize CL to CLT for storage if needed
                String statusToStore = excelValue;
                if ("CL".equalsIgnoreCase(excelValue)) {
                    statusToStore = "CLT";
                }

                AttendanceRecord record = new AttendanceRecord();
                record.setId(employee.getId() + ":" + date);
                record.setEmployeeId(employee.getId());
                record.setDate(date);
                record.setStatus(statusToStore);
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

    /**
     * Get cell value as string, handling numeric Excel dates correctly.
     * This method handles the case where Excel returns "#####" for narrow columns
     * by reading the underlying numeric value.
     */
    private String getCellRawValue(Row row, int columnIndex) {
        if (row == null) {
            return null;
        }
        Cell cell = row.getCell(columnIndex, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) {
            return null;
        }
        // Handle date-formatted cells directly
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            try {
                return cell.getLocalDateTimeCellValue().toLocalDate().toString(); // returns yyyy-MM-dd
            } catch (Exception ignored) {}
        }
        // Use DataFormatter to get the formatted value (handles "#####" by reading underlying value)
        DataFormatter formatter = new DataFormatter();
        String formatted = formatter.formatCellValue(cell);
        // If the result is "#####" (Excel's overflow indicator), try reading the numeric value directly
        if (formatted != null && formatted.replace("#", "").isEmpty()) {
            if (cell.getCellType() == CellType.NUMERIC) {
                double numericValue = cell.getNumericCellValue();
                // Check if it might be an Excel date serial number
                if (numericValue > 1) {
                    try {
                        LocalDate date = LocalDate.of(1900, 1, 1).plusDays((long) numericValue - 2);
                        return date.toString();
                    } catch (Exception ignored) {}
                }
                return String.valueOf((long) numericValue);
            }
        }
        return formatted;
    }

    private String getCellValue(Row row, int columnIndex) {
        String raw = getCellRawValue(row, columnIndex);
        return raw == null ? "" : raw.trim();
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) {
            return null;
        }
        String normalized = dateStr.trim();
        // Try yyyy-MM-dd first (direct match)
        if (normalized.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return LocalDate.parse(normalized);
        }
        // Try all registered formatters
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
            String email,
            Map<String, String> attendanceByDate
    ) {}
}