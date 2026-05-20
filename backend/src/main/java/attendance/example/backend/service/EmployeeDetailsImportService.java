package attendance.example.backend.service;

import attendance.example.backend.exception.ApiException;
import attendance.example.backend.model.Employee;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class EmployeeDetailsImportService {

    private final EmployeeService employeeService;

    public EmployeeDetailsImportService(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    public Map<String, Object> importEmployeeDetailsFile(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Select a CSV file before importing");
        }

        String fileName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (!fileName.endsWith(".csv")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only CSV files are supported for employee details import");
        }

        List<String> lines = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                lines.add(stripBom(line));
            }
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unable to read CSV file");
        }

        return importLines(lines.toArray(new String[0]));
    }

    private Map<String, Object> importLines(String[] lines) throws Exception {
        List<String> createdEmployees = new ArrayList<>();
        List<String> updatedEmployees = new ArrayList<>();
        List<String> skippedEmployees = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        boolean headerSkipped = false;

        for (int index = 0; index < lines.length; index++) {
            String rawLine = lines[index];
            if (rawLine == null || rawLine.isBlank()) {
                continue;
            }

            char delimiter = rawLine.contains("\t") ? '\t' : ',';
            List<String> columns = parseLine(rawLine, delimiter);
            while (!columns.isEmpty() && columns.get(columns.size() - 1).isBlank()) {
                columns.remove(columns.size() - 1);
            }

            if (columns.isEmpty()) {
                continue;
            }

            if (!headerSkipped && looksLikeHeader(columns)) {
                headerSkipped = true;
                continue;
            }

            if (columns.size() < 4) {
                errors.add("Line " + (index + 1) + ": expected 4 columns in order email, fullName, role, employeeId");
                continue;
            }

            String email = clean(columns.get(0));
            String fullName = clean(columns.get(1));
            String role = clean(columns.get(2));
            String employeeId = clean(columns.get(3));

            if (email.isBlank() && fullName.isBlank() && role.isBlank() && employeeId.isBlank()) {
                continue;
            }

            try {
                EmployeeService.ImportEmployeeResult result = employeeService.upsertImportedEmployee(
                        email,
                        fullName,
                        role,
                        employeeId
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
                errors.add("Line " + (index + 1) + ": " + exception.getMessage());
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("createdEmployees", createdEmployees);
        result.put("updatedEmployees", updatedEmployees);
        result.put("skippedEmployees", skippedEmployees);
        result.put("errors", errors);
        result.put("success", errors.isEmpty());
        return result;
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

    private String normalizeHeader(String value) {
        return clean(value).toLowerCase(Locale.ROOT);
    }

    private String clean(String value) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length() >= 2) {
            trimmed = trimmed.substring(1, trimmed.length() - 1).trim();
        }
        return trimmed;
    }

    private String stripBom(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        return value.charAt(0) == '\uFEFF' ? value.substring(1) : value;
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
}
