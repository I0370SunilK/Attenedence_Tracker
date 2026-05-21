package attendance.example.backend.service;

import attendance.example.backend.dto.MonthlyDetailsResponse;
import attendance.example.backend.exception.ApiException;
import attendance.example.backend.model.AttendanceRecord;
import attendance.example.backend.model.Employee;
import attendance.example.backend.repository.AttendanceRecordRepository;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class AttendanceService {

    private static final Logger log = LoggerFactory.getLogger(AttendanceService.class);

    private static final Set<String> ALLOWED_STATUSES = Set.of("WFO", "WFH", "CLT", "PTO", "HOL", "WHO");

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final MongoTemplate mongoTemplate;
    private final EmployeeService employeeService;
    private final NotificationService notificationService;

    public AttendanceService(
            AttendanceRecordRepository attendanceRecordRepository,
            MongoTemplate mongoTemplate,
            EmployeeService employeeService,
            NotificationService notificationService
    ) {
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.mongoTemplate = mongoTemplate;
        this.employeeService = employeeService;
        this.notificationService = notificationService;
    }

    public List<AttendanceRecord> getAttendance(String employeeKey) throws Exception {
        Employee employee = employeeService.requireEmployee(employeeKey);
        return readAttendanceForEmployee(employee, null, null);
    }

    public List<AttendanceRecord> getAttendance(String employeeKey, String from, String to) throws Exception {
        Employee employee = employeeService.requireEmployee(employeeKey);
        return readAttendanceForEmployee(employee, from, to);
    }

    public Map<String, List<AttendanceRecord>> getAttendanceForEmployees(List<String> employeeKeys, String from, String to) throws Exception {
        Map<String, List<AttendanceRecord>> response = new LinkedHashMap<>();
        for (String employeeKey : employeeKeys) {
            if (employeeKey == null || employeeKey.isBlank()) {
                continue;
            }
            String trimmed = employeeKey.trim();
            try {
                Employee employee = employeeService.requireEmployee(trimmed);
                response.put(trimmed, readAttendanceForEmployee(employee, from, to));
            } catch (ApiException exception) {
                log.warn("Skipping attendance load for unknown employee key {}: {}", trimmed, exception.getMessage());
                response.put(trimmed, List.of());
            }
        }
        return response;
    }

    public List<MonthlyDetailsResponse> getMonthlyDetails(
            String employeeKey,
            int month,
            int year,
            String type
    ) throws Exception {
        Employee employee = employeeService.requireEmployee(employeeKey);
        validateMonthYear(month, year);

        String typeNormalized = type != null ? type.toUpperCase().trim() : "";
        if (typeNormalized.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Attendance type is required");
        }

        if (!ALLOWED_STATUSES.contains(typeNormalized)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid attendance type");
        }

        List<AttendanceRecord> allRecords = readAttendanceForEmployee(employee, null, null);

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
                        record.getStatus()
                ));
            }
        }

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

    public List<AttendanceRecord> markAttendance(String employeeKey, AttendanceRecord request) throws Exception {
        Employee employee = employeeService.requireEmployee(employeeKey);
        String internalId = employee.getId();
        AttendanceRecord normalized = normalize(request);
        ensureEditable(normalized.getDate());
        upsertAttendance(internalId, normalized, true);

        boolean isToday = normalized.getDate().equals(LocalDate.now().toString());
        if (isToday && !normalized.getEdited()) {
            List<AttendanceRecord> allRecords = readAttendanceForEmployee(employee, null, null);
            long streak = calculateStreak(allRecords);
            if (streak > 0) {
                notificationService.createNotification(
                        internalId,
                        "success",
                        "🔥 " + streak + "-day streak!",
                        "You've maintained attendance for " + streak + " working day" + (streak > 1 ? "s" : "") + " in a row.",
                        null,
                        null
                );
            }
        }

        return readAttendanceForEmployee(employee, null, null);
    }

    public AttendanceRecord saveImportedAttendance(String employeeKey, AttendanceRecord request) throws Exception {
        Employee employee = employeeService.requireEmployee(employeeKey);
        AttendanceRecord normalized = normalize(request);
        return upsertAttendance(employee.getId(), normalized, false);
    }

    private long calculateStreak(List<AttendanceRecord> records) {
        if (records.isEmpty()) {
            return 0;
        }
        records.sort(Comparator.comparing(AttendanceRecord::getDate).reversed());
        long streak = 0;
        LocalDate expected = LocalDate.now();
        for (AttendanceRecord record : records) {
            LocalDate date = LocalDate.parse(record.getDate());
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

    /**
     * Reads attendance for an employee. The {@code employeeId} field on each record stores
     * {@link Employee#getId()} (MongoDB document id), not the business code (e.g. A3748).
     * Also checks business code for any legacy rows.
     */
    private List<AttendanceRecord> readAttendanceForEmployee(Employee employee, String from, String to) {
        String internalId = employee.getId();
        String businessId = employee.getEmployeeId();

        LinkedHashMap<String, AttendanceRecord> byDate = new LinkedHashMap<>();
        mergeRecords(byDate, queryRecords(internalId, from, to));
        if (businessId != null && !businessId.equalsIgnoreCase(internalId)) {
            mergeRecords(byDate, queryRecords(businessId, from, to));
        }

        List<AttendanceRecord> records = new ArrayList<>(byDate.values());
        records.forEach(this::defaultEditedFlag);
        records.sort(Comparator.comparing(AttendanceRecord::getDate).reversed());
        log.debug("Read {} attendance record(s) for employee {} (mongoId={}, businessId={})",
                records.size(), employee.getFullName(), internalId, businessId);
        return records;
    }

    private void mergeRecords(Map<String, AttendanceRecord> byDate, List<AttendanceRecord> incoming) {
        for (AttendanceRecord record : incoming) {
            byDate.putIfAbsent(record.getDate(), record);
        }
    }

    private List<AttendanceRecord> queryRecords(String storageKey, String from, String to) {
        Query query = Query.query(Criteria.where("employeeId").is(storageKey));
        List<Document> documents = mongoTemplate.find(query, Document.class, "attendance_records");
        List<AttendanceRecord> records = new ArrayList<>();

        for (Document document : documents) {
            try {
                AttendanceRecord record = toAttendanceRecord(document);
                if (record == null || !isWithinRange(record.getDate(), from, to)) {
                    continue;
                }
                records.add(record);
            } catch (RuntimeException exception) {
                log.warn("Skipping malformed attendance record for employeeRef={} documentId={}: {}",
                        storageKey, document.get("_id"), exception.getMessage());
            }
        }

        return records;
    }

    private AttendanceRecord toAttendanceRecord(Document document) {
        String date = normalizeDateValue(document.get("date"));
        String status = normalizeStatus(document.get("status"));
        if (date == null || status == null) {
            return null;
        }

        AttendanceRecord record = new AttendanceRecord();
        Object id = document.get("_id");
        record.setId(id != null ? id.toString() : null);
        record.setEmployeeId(stringValue(document.get("employeeId")));
        record.setDate(date);
        record.setStatus(status);
        record.setMarkedAt(normalizeTimestampValue(document.get("markedAt")));
        record.setEdited(normalizeBooleanValue(document.get("edited")));
        defaultEditedFlag(record);
        return record;
    }

    private boolean isWithinRange(String date, String from, String to) {
        if (from != null && !from.isBlank() && date.compareTo(from.trim()) < 0) {
            return false;
        }
        return to == null || to.isBlank() || date.compareTo(to.trim()) <= 0;
    }

    private String normalizeStatus(Object value) {
        String status = stringValue(value);
        if (status == null) {
            return null;
        }
        status = status.toUpperCase(Locale.ROOT);
        return ALLOWED_STATUSES.contains(status) ? status : null;
    }

    private String normalizeDateValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Date date) {
            return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate().toString();
        }
        String text = stringValue(value);
        if (text == null) {
            return null;
        }
        try {
            return LocalDate.parse(text).toString();
        } catch (DateTimeParseException ignored) {
            try {
                return Instant.parse(text).atZone(ZoneId.systemDefault()).toLocalDate().toString();
            } catch (DateTimeParseException exception) {
                throw new IllegalArgumentException("Invalid attendance date: " + text);
            }
        }
    }

    private String normalizeTimestampValue(Object value) {
        if (value == null) {
            return Instant.now().toString();
        }
        if (value instanceof Date date) {
            return date.toInstant().toString();
        }
        String text = stringValue(value);
        return text != null ? text : Instant.now().toString();
    }

    private Boolean normalizeBooleanValue(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof String text) {
            return Boolean.parseBoolean(text);
        }
        return false;
    }

    private String stringValue(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
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

    private AttendanceRecord upsertAttendance(String internalEmployeeId, AttendanceRecord record, boolean preserveEditedFlag) {
        Optional<AttendanceRecord> existing = attendanceRecordRepository.findByEmployeeIdAndDate(internalEmployeeId, record.getDate());
        record.setId(existing.map(AttendanceRecord::getId).orElse(internalEmployeeId + ":" + record.getDate()));
        record.setEmployeeId(internalEmployeeId);
        record.setEdited(existing.isPresent() || (preserveEditedFlag && Boolean.TRUE.equals(record.getEdited())));
        AttendanceRecord saved = attendanceRecordRepository.save(record);
        defaultEditedFlag(saved);
        log.info("Attendance persisted to MongoDB Atlas — mongoEmployeeRef={}, businessKeyStoredAsEmployeeIdField={}, date={}, mongoDocumentId={}",
                internalEmployeeId, saved.getEmployeeId(), saved.getDate(), saved.getId());
        return saved;
    }

    private void defaultEditedFlag(AttendanceRecord record) {
        if (record.getEdited() == null) {
            record.setEdited(false);
        }
    }
}
