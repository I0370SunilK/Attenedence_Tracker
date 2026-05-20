package attendance.example.backend.controller;

import attendance.example.backend.dto.MonthlyDetailsResponse;
import attendance.example.backend.model.AttendanceRecord;
import attendance.example.backend.service.AttendanceService;
import attendance.example.backend.service.ExcelImportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final ExcelImportService excelImportService;

    public AttendanceController(AttendanceService attendanceService, ExcelImportService excelImportService) {
        this.attendanceService = attendanceService;
        this.excelImportService = excelImportService;
    }

    @GetMapping
    public ResponseEntity<Map<String, java.util.List<AttendanceRecord>>> getAttendanceForEmployees(
            @RequestParam("employeeIds") String employeeIds,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to
    ) throws Exception {
        java.util.List<String> ids = java.util.Arrays.stream(employeeIds.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(attendanceService.getAttendanceForEmployees(ids, from, to));
    }

    @GetMapping("/monthly-details/{employeeId}")
    public ResponseEntity<java.util.List<MonthlyDetailsResponse>> getMonthlyDetails(
            @PathVariable String employeeId,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String type
    ) throws Exception {
        if (month == null || year == null || type == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "month, year, and type parameters are required");
        }
        return ResponseEntity.ok(attendanceService.getMonthlyDetails(employeeId, month, year, type));
    }

    @GetMapping("/{employeeId}")
    public ResponseEntity<java.util.List<AttendanceRecord>> getAttendance(
            @PathVariable String employeeId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to
    ) throws Exception {
        return ResponseEntity.ok(attendanceService.getAttendance(employeeId, from, to));
    }

    @PostMapping("/{employeeId}")
    public ResponseEntity<java.util.List<AttendanceRecord>> markAttendance(
            @PathVariable String employeeId,
            @RequestBody AttendanceRecord request
    ) throws Exception {
        return ResponseEntity.ok(attendanceService.markAttendance(employeeId, request));
    }

    @PostMapping("/import-excel")
    public ResponseEntity<Map<String, Object>> importExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam("month") int month,
            @RequestParam("year") int year
    ) throws Exception {
        Map<String, Object> result = excelImportService.importExcel(file, month, year);
        return ResponseEntity.ok(result);
    }
}
