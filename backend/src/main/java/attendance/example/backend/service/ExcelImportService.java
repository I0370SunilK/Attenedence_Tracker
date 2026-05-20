package attendance.example.backend.service;

import attendance.example.backend.dto.SignupRequest;
import attendance.example.backend.model.AttendanceRecord;
import attendance.example.backend.model.Employee;
import attendance.example.backend.util.PasswordEncoder;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.Date;

@Service
public class ExcelImportService {

    private final EmployeeService employeeService;
    private final AttendanceService attendanceService;

    public ExcelImportService(EmployeeService employeeService, AttendanceService attendanceService) {
        this.employeeService = employeeService;
        this.attendanceService = attendanceService;
    }

    public Map<String, Object> importExcel(MultipartFile file, int month, int year) throws IOException {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        List<String> createdEmployees = new ArrayList<>();
        List<String> updatedAttendance = new ArrayList<>();

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(inputStream)) {

            // Get the "Attendence Tracking" sheet (note the misspelling)
            Sheet sheet = workbook.getSheet("Attendence Tracking");
            if (sheet == null) {
                errors.add("Sheet 'Attendence Tracking' not found in the Excel file");
                result.put("errors", errors);
                return result;
            }

            // Row 1 = dates, Row 2 = weekday labels, Rows 3+ = employee attendance data
            Row dateRow = sheet.getRow(0); // Row 1 (0-indexed) has dates
            if (dateRow == null) {
                errors.add("Date row (row 1) is missing");
                result.put("errors", errors);
                return result;
            }

            // Collect all dates from row 1 starting from column F (index 5)
            List<LocalDate> dates = new ArrayList<>();
            for (int colIndex = 5; colIndex < dateRow.getLastCellNum(); colIndex++) {
                Cell dateCell = dateRow.getCell(colIndex);
                if (dateCell != null) {
                    String dateStr = getStringCellValue(dateCell);
                    LocalDate date = parseDate(dateStr);
                    if (date != null) {
                        dates.add(date);
                    }
                }
            }

            if (dates.isEmpty()) {
                errors.add("No valid dates found in the date row");
                result.put("errors", errors);
                return result;
            }

            // First pass: create/find all employees
            Map<String, Employee> employees = new HashMap<>();
            for (int rowIndex = 2; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) continue;

                try {
                    // Employee info is in columns A-E (indices 0-4)
                    String rawEmployeeId = getStringCellValue(row.getCell(0)); // Column A
                    String employeeId;
                    try {
                        employeeId = "I" + String.format("%04d", Integer.parseInt(rawEmployeeId.trim())); // Format as I0001, I0002, etc.
                    } catch (NumberFormatException e) {
                        employeeId = "I" + rawEmployeeId.trim(); // If not a number, just prefix with I
                    }
                    String fullName = getStringCellValue(row.getCell(1));   // Column B
                    String designation = getStringCellValue(row.getCell(2)); // Column C
                    String team = getStringCellValue(row.getCell(3));       // Column D
                    String email = getStringCellValue(row.getCell(4));      // Column E

                    if (rawEmployeeId == null || rawEmployeeId.isEmpty() ||
                        fullName == null || fullName.isEmpty()) {
                        // Skip empty rows
                        continue;
                    }

                    // Find or create employee
                    Employee employee = employeeService.findByEmployeeId(employeeId);
                    if (employee == null) {
                        SignupRequest signupRequest = new SignupRequest();
                        signupRequest.setFullName(fullName);
                        signupRequest.setEmployeeId(employeeId);
                        signupRequest.setDesignation(designation != null && !designation.isEmpty() ? designation : "Associate");
                        signupRequest.setTeam(team != null && !team.isEmpty() ? team : "General");
                        signupRequest.setEmail(email != null && !email.isEmpty() ? email : employeeId.toLowerCase() + "@srmtech.com");
                        signupRequest.setCity("Hyderabad");
                        signupRequest.setState("Telangana");
                        signupRequest.setCountry("India");
                        signupRequest.setPassword("password"); // Default password
                        signupRequest.setAvatarColor("#" + Integer.toHexString(new Random().nextInt(0xffffff)));

                        try {
                            // Hash the password before creating employee
                            String hashedPassword = PasswordEncoder.encode(signupRequest.getPassword());
                            employee = employeeService.createEmployee(UUID.randomUUID().toString(), signupRequest, hashedPassword);
                            createdEmployees.add(employeeId);
                        } catch (Exception e) {
                            errors.add("Row " + (rowIndex + 1) + ": Failed to create employee '" + employeeId + "' - " + e.getMessage());
                            continue;
                        }
                    }
                    employees.put(employeeId, employee);

                } catch (Exception e) {
                    errors.add("Row " + (rowIndex + 1) + ": Error processing row - " + e.getMessage());
                }
            }

            // Second pass: mark attendance for all employees
            for (int rowIndex = 2; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) continue;

                try {
                    // Employee info
                    String rawEmployeeId = getStringCellValue(row.getCell(0));
                    String employeeId;
                    try {
                        employeeId = "I" + String.format("%04d", Integer.parseInt(rawEmployeeId.trim()));
                    } catch (NumberFormatException e) {
                        employeeId = "I" + rawEmployeeId.trim();
                    }

                    if (rawEmployeeId == null || rawEmployeeId.isEmpty()) {
                        continue;
                    }

                    Employee employee = employees.get(employeeId);
                    if (employee == null) continue; // Skip if employee creation failed

                    // Process attendance data for this employee (columns F onward)
                    for (int colIndex = 5; colIndex < row.getLastCellNum() && (colIndex - 5) < dates.size(); colIndex++) {
                        Cell statusCell = row.getCell(colIndex);
                        String statusStr = getStringCellValue(statusCell);

                        if (statusStr == null || statusStr.trim().isEmpty()) {
                            continue; // Skip empty attendance cells
                        }

                        LocalDate date = dates.get(colIndex - 5);

                        // Filter by month and year if specified
                        if (month > 0 && year > 0) {
                            if (date.getMonthValue() != month || date.getYear() != year) {
                                continue; // Skip records not in specified month/year
                            }
                        }

                        // Validate attendance status
                        List<String> validStatuses = Arrays.asList("WFO", "WFH", "CLT", "PTO", "HOL", "WHO");
                        String status = statusStr.toUpperCase().trim();
                        if (!validStatuses.contains(status)) {
                            errors.add("Row " + (rowIndex + 1) + ", Column " + (colIndex + 1) + ": Invalid status '" + statusStr + "'. Valid values: " + validStatuses);
                            continue;
                        }

                        // Mark attendance for this date
                        try {
                            AttendanceRecord record = new AttendanceRecord();
                            record.setDate(date.toString());
                            record.setStatus(status);
                            record.setMarkedAt(new Date().toString());

                            attendanceService.saveImportedAttendance(employee.getId(), record);

                            updatedAttendance.add(employeeId + " on " + date);
                        } catch (Exception e) {
                            errors.add("Row " + (rowIndex + 1) + ", Column " + (colIndex + 1) + ": Failed to mark attendance - " + e.getMessage());
                        }
                    }

                } catch (Exception e) {
                    errors.add("Row " + (rowIndex + 1) + ": Error processing row - " + e.getMessage());
                }
            }
        }

        result.put("createdEmployees", createdEmployees);
        result.put("updatedAttendance", updatedAttendance);
        result.put("errors", errors);
        result.put("success", errors.isEmpty());

        return result;
    }

    private String getStringCellValue(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    Date date = cell.getDateCellValue();
                    LocalDate localDate = date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                    return localDate.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                } else {
                    return String.valueOf((long) cell.getNumericCellValue());
                }
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                return cell.getCellFormula();
            default:
                return "";
        }
    }

    private LocalDate parseDate(String dateStr) {
        try {
            // Try various date formats
            DateTimeFormatter[] formatters = {
                    DateTimeFormatter.ofPattern("yyyy-MM-dd"),
                    DateTimeFormatter.ofPattern("dd/MM/yyyy"),
                    DateTimeFormatter.ofPattern("MM/dd/yyyy"),
                    DateTimeFormatter.ofPattern("dd-MM-yyyy"),
                    DateTimeFormatter.ofPattern("yyyy/MM/dd")
            };

            for (DateTimeFormatter formatter : formatters) {
                try {
                    return LocalDate.parse(dateStr, formatter);
                } catch (Exception ignored) {
                }
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }
}
