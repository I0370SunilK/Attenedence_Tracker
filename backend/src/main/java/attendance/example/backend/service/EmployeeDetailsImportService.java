package attendance.example.backend.service;

import attendance.example.backend.exception.ApiException;
import attendance.example.backend.model.Employee;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class EmployeeDetailsImportService {

    private static final int PREVIEW_LIMIT = 10;

    private final EmployeeService employeeService;

    public EmployeeDetailsImportService(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    public Map<String, Object> previewEmployeeDetailsFile(MultipartFile file) throws Exception {
        ParsedEmployeeSheet parsed = parseEmployeeDetailsFile(file);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("mode", "preview");
        result.put("fileType", parsed.fileType());
        result.put("totalRows", parsed.totalRows());
        result.put("validRows", parsed.validRows().size());
        result.put("previewRows", buildPreviewRows(parsed.validRows()));
        result.put("errors", parsed.errors());
        result.put("success", parsed.errors().isEmpty() || !parsed.validRows().isEmpty());
        return result;
    }

    public Map<String, Object> importEmployeeDetailsFile(MultipartFile file) throws Exception {
        ParsedEmployeeSheet parsed = parseEmployeeDetailsFile(file);
        List<String> createdEmployees = new ArrayList<>();
        List<String> updatedEmployees = new ArrayList<>();
        List<String> skippedEmployees = new ArrayList<>();
        List<String> errors = new ArrayList<>(parsed.errors());

        for (EmployeeImportRow row : parsed.validRows()) {
            try {
                EmployeeService.ImportEmployeeResult result = employeeService.upsertImportedEmployee(
                        row.email(),
                        row.fullName(),
                        row.role(),
                        row.employeeId(),
                        row.team()
                );
                String summary = result.employee().getEmployeeId() + " - " + result.employee().getFullName();
                if (result.created()) {
                    createdEmployees.add(summary);
                } else if (result.updated()) {
                    updatedEmployees.add(summary);
                } else {
                    skippedEmployees.add(summary);
                }
            } catch (Exception exception) {
                errors.add("Row " + row.sourceRowNumber() + ": " + exception.getMessage());
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("mode", "import");
        result.put("fileType", parsed.fileType());
        result.put("totalRows", parsed.totalRows());
        result.put("validRows", parsed.validRows().size());
        result.put("createdEmployees", createdEmployees);
        result.put("updatedEmployees", updatedEmployees);
        result.put("skippedEmployees", skippedEmployees);
        result.put("previewRows", buildPreviewRows(parsed.validRows()));
        result.put("errors", errors);
        result.put("success", errors.isEmpty());
        return result;
    }

    private ParsedEmployeeSheet parseEmployeeDetailsFile(MultipartFile file) throws Exception {
        validateFile(file);

        String fileName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (fileName.endsWith(".csv")) {
            return parseCsv(file);
        }
        if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
            return parseWorkbook(file);
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "Supported formats are CSV, XLSX, and XLS for employee details import");
    }

    private ParsedEmployeeSheet parseCsv(MultipartFile file) throws Exception {
        List<EmployeeImportRow> rows = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        ImportFormat detectedFormat = null;
        int totalRows = 0;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String rawLine;
            int lineNumber = 0;
            while ((rawLine = reader.readLine()) != null) {
                lineNumber++;
                rawLine = stripBom(rawLine);
                if (rawLine == null || rawLine.isBlank()) {
                    continue;
                }

                char delimiter = rawLine.contains("\t") ? '\t' : ',';
                List<String> columns = parseLine(rawLine, delimiter);
                trimTrailingBlanks(columns);
                if (columns.isEmpty()) {
                    continue;
                }

                if (detectedFormat == null) {
                    detectedFormat = detectFormat(columns);
                }
                if (isHeaderRow(columns, detectedFormat)) {
                    continue;
                }

                totalRows++;
                mapColumns(columns, detectedFormat, lineNumber, rows, errors);
            }
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to read employee details CSV file");
        }

        return new ParsedEmployeeSheet("csv", totalRows, rows, errors);
    }

    private ParsedEmployeeSheet parseWorkbook(MultipartFile file) throws Exception {
        List<EmployeeImportRow> rows = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();
        ImportFormat detectedFormat = null;
        int totalRows = 0;

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Excel file does not contain any sheets");
            }

            for (int rowIndex = sheet.getFirstRowNum(); rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) {
                    continue;
                }

                List<String> columns = new ArrayList<>();
                int lastCell = Math.max(row.getLastCellNum(), 4);
                for (int cellIndex = 0; cellIndex < lastCell; cellIndex++) {
                    Cell cell = row.getCell(cellIndex, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    columns.add(clean(cell == null ? "" : formatter.formatCellValue(cell)));
                }
                trimTrailingBlanks(columns);
                if (columns.isEmpty()) {
                    continue;
                }

                if (detectedFormat == null) {
                    detectedFormat = detectFormat(columns);
                }
                if (isHeaderRow(columns, detectedFormat)) {
                    continue;
                }

                totalRows++;
                mapColumns(columns, detectedFormat, rowIndex + 1, rows, errors);
            }
        } catch (ApiException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to read employee details Excel file");
        }

        return new ParsedEmployeeSheet("excel", totalRows, rows, errors);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Select a file before importing");
        }
    }

    private void mapColumns(
            List<String> columns,
            ImportFormat format,
            int sourceRowNumber,
            List<EmployeeImportRow> rows,
            List<String> errors
    ) {
        if (columns.size() < 4) {
            errors.add("Row " + sourceRowNumber + ": expected 4 columns. Supported orders: employeeId, fullName, team, email OR email, fullName, role, employeeId");
            return;
        }

        EmployeeImportRow row = format == ImportFormat.SPREADSHEET
                ? new EmployeeImportRow(
                clean(columns.get(3)),
                clean(columns.get(1)),
                "Employee",
                clean(columns.get(0)),
                clean(columns.get(2)),
                sourceRowNumber
        )
                : new EmployeeImportRow(
                clean(columns.get(0)),
                clean(columns.get(1)),
                clean(columns.get(2)),
                clean(columns.get(3)),
                "",
                sourceRowNumber
        );

        if (row.email().isBlank() && row.fullName().isBlank() && row.employeeId().isBlank() && row.team().isBlank()) {
            return;
        }
        if (row.employeeId().isBlank()) {
            errors.add("Row " + sourceRowNumber + ": Employee ID is required");
            return;
        }
        if (row.fullName().isBlank()) {
            errors.add("Row " + sourceRowNumber + ": Full name is required");
            return;
        }
        if (row.email().isBlank()) {
            errors.add("Row " + sourceRowNumber + ": Email is required");
            return;
        }
        rows.add(row);
    }

    private List<Map<String, String>> buildPreviewRows(List<EmployeeImportRow> rows) {
        List<Map<String, String>> preview = new ArrayList<>();
        for (int index = 0; index < Math.min(rows.size(), PREVIEW_LIMIT); index++) {
            EmployeeImportRow row = rows.get(index);
            Map<String, String> item = new LinkedHashMap<>();
            item.put("rowNumber", String.valueOf(row.sourceRowNumber()));
            item.put("employeeId", row.employeeId());
            item.put("fullName", row.fullName());
            item.put("team", row.team());
            item.put("email", row.email());
            preview.add(item);
        }
        return preview;
    }

    private boolean looksLikeHeader(List<String> columns) {
        if (columns.size() < 4) {
            return false;
        }
        String first = normalizeHeader(columns.get(0));
        String second = normalizeHeader(columns.get(1));
        String third = normalizeHeader(columns.get(2));
        String fourth = normalizeHeader(columns.get(3));
        return first.equals("email")
                && (second.equals("fullname") || second.equals("full name"))
                && third.equals("role")
                && (fourth.equals("employeeid") || fourth.equals("employee id"));
    }

    private boolean looksLikeSpreadsheetHeader(List<String> columns) {
        if (columns.size() < 4) {
            return false;
        }
        String first = normalizeHeader(columns.get(0));
        String second = normalizeHeader(columns.get(1));
        String third = normalizeHeader(columns.get(2));
        String fourth = normalizeHeader(columns.get(3));
        return (first.equals("employeeid") || first.equals("employee id"))
                && (second.equals("fullname") || second.equals("full name"))
                && third.equals("team")
                && fourth.equals("email");
    }

    private ImportFormat detectFormat(List<String> columns) {
        if (looksLikeSpreadsheetHeader(columns)) {
            return ImportFormat.SPREADSHEET;
        }
        if (looksLikeHeader(columns)) {
            return ImportFormat.LEGACY;
        }

        String first = clean(columns.get(0));
        String fourth = clean(columns.get(3));
        if (looksLikeEmployeeId(first) && looksLikeEmail(fourth)) {
            return ImportFormat.SPREADSHEET;
        }
        return ImportFormat.LEGACY;
    }

    private boolean isHeaderRow(List<String> columns, ImportFormat format) {
        return format == ImportFormat.SPREADSHEET ? looksLikeSpreadsheetHeader(columns) : looksLikeHeader(columns);
    }

    private boolean looksLikeEmployeeId(String value) {
        return value != null && value.trim().toUpperCase(Locale.ROOT).matches("^[IA]\\d{4}$");
    }

    private boolean looksLikeEmail(String value) {
        return value != null && value.contains("@");
    }

    private String normalizeHeader(String value) {
        return clean(value).toLowerCase(Locale.ROOT);
    }

    private String clean(String value) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length() >= 2) {
            trimmed = trimmed.substring(1, trimmed.length() - 1).trim();
        }
        trimmed = trimmed
                .replace('\uFEFF', ' ')
                .replace('\u00A0', ' ')
                .replace('\u2007', ' ')
                .replace('\u202F', ' ')
                .replace('\uFFFD', ' ');
        trimmed = trimmed.replaceAll("[\\p{Cntrl}&&[^\r\n\t]]", " ");
        trimmed = trimmed.replaceAll("\\s+", " ").trim();
        return trimmed;
    }

    private String stripBom(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        return value.charAt(0) == '\uFEFF' ? value.substring(1) : value;
    }

    private void trimTrailingBlanks(List<String> columns) {
        while (!columns.isEmpty() && columns.get(columns.size() - 1).isBlank()) {
            columns.remove(columns.size() - 1);
        }
    }

    private List<String> parseLine(String line, char delimiter) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch == delimiter && !inQuotes) {
                values.add(current.toString());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }

        values.add(current.toString());
        return values;
    }

    private enum ImportFormat {
        LEGACY,
        SPREADSHEET
    }

    private record EmployeeImportRow(
            String email,
            String fullName,
            String role,
            String employeeId,
            String team,
            int sourceRowNumber
    ) {
    }

    private record ParsedEmployeeSheet(
            String fileType,
            int totalRows,
            List<EmployeeImportRow> validRows,
            List<String> errors
    ) {
    }
}
