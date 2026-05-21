package attendance.example.backend.service;

import attendance.example.backend.dto.MonthlyDetailsResponse;
import attendance.example.backend.exception.ApiException;
import attendance.example.backend.model.AttendanceRecord;
import attendance.example.backend.repository.AttendanceRecordRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class AttendanceService {

    private static final Set<String> ALLOWED_STATUSES = Set.of("WFO", "WFH", "CLT", "PTO", "HOL", "WHO");

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final EmployeeService employeeService;
    private final NotificationService notificationService;

    public AttendanceService(
            AttendanceRecordRepository attendanceRecordRepository,
            EmployeeService employeeService,
            NotificationService notificationService) {
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.employeeService = employeeService;
        this.notificationService = notificationService;
    }

    public List<AttendanceRecord> getAttendance(String employeeId) throws Exception {
        employeeService.requireEmployee(employeeId);
        return readAttendance(employeeId);
    }

    public List<AttendanceRecord> getAttendance(String employeeId, String from, String to) throws Exception {
        employeeService.requireEmployee(employeeId);
        return readAttendance(employeeId, from, to);
    }

    public Map<String, List<AttendanceRecord>> getAttendanceForEmployees(List<String> employeeIds, String from,
            String to) throws Exception {
        Map<String, List<AttendanceRecord>> response = new LinkedHashMap<>();
        for (String employeeId : employeeIds) {
            if (employeeId == null || employeeId.isBlank()) {
                continue;
            }
            response.put(employeeId, readAttendance(employeeId.trim(), from, to));
        }
        return response;
    }

    public List<MonthlyDetailsResponse> getMonthlyDetails(
            String employeeId,
            int month,
            int year,
            String type) throws Exception {
        employeeService.requireEmployee(employeeId);
        validateMonthYear(month, year);

        String typeNormalized = type != null ? type.toUpperCase().trim() : "";
        if (typeNormalized.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Attendance type is required");
        }

        if (!ALLOWED_STATUSES.contains(typeNormalized)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid attendance type");
        }

        // Get all records for the employee
        List<AttendanceRecord> allRecords = readAttendance(employeeId);

        // Filter by month, year, and type
        List<MonthlyDetailsResponse> result = new ArrayList<>();
        YearMonth targetMonth = YearMonth.of(year, month);

        for (AttendanceRecord record : allRecords) {
            LocalDate date = LocalDate.parse(record.getDate());
            YearMonth recordMonth = YearMonth.from(date);

            if (recordMonth.equals(targetMonth) && record.getStatus().equals(typeNormalized)) {
                String dayName = date.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
                result.add(new MonthlyDetailsResponse(
                        record.getDate(),
                        dayName,
                        record.getStatus()));
            }
        }

        // Sort by date
        result.sort(Comparator.comparing(MonthlyDetailsResponse::getDate));

        return result;
    }

    private void validateMonthYear(int month, int year) {
        if (month < 1 || month > 12) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Month must be between 1 and 12");
        }

        int currentYear = LocalDate.now().getYear();
        if (year < 2000 || year > currentYear + 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Year must be between 2000 and " + (currentYear + 1));
        }
    }

    public List<AttendanceRecord> markAttendance(String employeeId, AttendanceRecord request) throws Exception {
        employeeService.requireEmployee(employeeId);
        AttendanceRecord normalized = normalize(request);
        ensureEditable(normalized.getDate());
        upsertAttendance(employeeId, normalized, true);

        // Calculate streak and send notification
        boolean isToday = normalized.getDate().equals(java.time.LocalDate.now().toString());
        if (isToday && !normalized.getEdited()) {
            List<AttendanceRecord> allRecords = readAttendance(employeeId);
            long streak = calculateStreak(allRecords);
            if (streak > 0) {
                notificationService.createNotification(
                        employeeId,
                        "success",
                        "🔥 " + streak + "-day streak!",
                        "You've maintained attendance for " + streak + " working day" + (streak > 1 ? "s" : "")
                                + " in a row.",
                        null,
                        null);
            }
        }

        return readAttendance(employeeId);
    }

    public AttendanceRecord saveImportedAttendance(String employeeId, AttendanceRecord request) throws Exception {
        employeeService.requireEmployee(employeeId);
        AttendanceRecord normalized = normalize(request);
        return upsertAttendance(employeeId, normalized, false);
    }

    private long calculateStreak(List<AttendanceRecord> records) {
        if (records.isEmpty())
            return 0;
        records.sort(Comparator.comparing(AttendanceRecord::getDate).reversed());
        long streak = 0;
        java.time.LocalDate expected = java.time.LocalDate.now();
        for (AttendanceRecord r : records) {
            java.time.LocalDate date = java.time.LocalDate.parse(r.getDate());
            if (date.equals(expected) || date.equals(expected.minusDays(1))) {
                if (date.equals(expected)) {
                    streak++;
                    expected = expected.minusDays(1);
                } else if (date.equals(expected.minusDays(1))) {
                    streak++;
                    expected = expected.minusDays(1);
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        return streak;
    }

    private List<AttendanceRecord> readAttendance(String employeeId, String from, String to) throws Exception {
        List<AttendanceRecord> records;
        if (from != null && !from.isBlank() && to != null && !to.isBlank()) {
            records = new ArrayList<>(attendanceRecordRepository
                    .findByEmployeeDateRange(employeeId, from, to));
        } else if (from != null && !from.isBlank()) {
            records = new ArrayList<>(attendanceRecordRepository
                    .findByEmployeeIdAndDateGreaterThanEqual(employeeId, from));
        } else if (to != null && !to.isBlank()) {
            records = new ArrayList<>(attendanceRecordRepository
                    .findByEmployeeIdAndDateLessThanEqual(employeeId, to));
        } else {
            records = new ArrayList<>(attendanceRecordRepository.findByEmployeeId(employeeId));
        }
        records.forEach(this::defaultEditedFlag);
        records.sort(Comparator.comparing(AttendanceRecord::getDate).reversed());
        return records;
    }

    private List<AttendanceRecord> readAttendance(String employeeId) throws Exception {
        return readAttendance(employeeId, null, null);
    }

    private AttendanceRecord normalize(AttendanceRecord request) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Attendance payload is required");
        }
        String date = requireText(request.getDate(), "Attendance date is required");
        String status = requireText(request.getStatus(), "Attendance status is required").toUpperCase();
        String markedAt = requireText(request.getMarkedAt(), "markedAt is required");

        try {
            LocalDate.parse(date);
        } catch (DateTimeParseException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Date must be in YYYY-MM-DD format");
        }

        if (!ALLOWED_STATUSES.contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status must be one of WFO, WFH, CLT, PTO, HOL");
        }

        AttendanceRecord normalized = new AttendanceRecord();
        normalized.setDate(date);
        normalized.setStatus(status);
        normalized.setMarkedAt(markedAt);
        normalized.setEdited(Boolean.TRUE.equals(request.getEdited()));
        return normalized;
    }

    private void ensureEditable(String date) {
        LocalDate target = LocalDate.parse(date);
        LocalDate today = LocalDate.now();
        if (target.isAfter(today)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Future attendance cannot be marked");
        }
    }

    private String requireText(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private AttendanceRecord upsertAttendance(String employeeId, AttendanceRecord record, boolean preserveEditedFlag) {
        Optional<AttendanceRecord> existing = attendanceRecordRepository.findByEmployeeIdAndDate(employeeId,
                record.getDate());
        record.setId(existing.map(AttendanceRecord::getId).orElse(employeeId + ":" + record.getDate()));
        record.setEmployeeId(employeeId);
        record.setEdited(existing.isPresent() || (preserveEditedFlag && Boolean.TRUE.equals(record.getEdited())));
        AttendanceRecord saved = attendanceRecordRepository.save(record);
        defaultEditedFlag(saved);
        return saved;
    }

    private void defaultEditedFlag(AttendanceRecord record) {
        if (record.getEdited() == null) {
            record.setEdited(false);
        }
    }
}
