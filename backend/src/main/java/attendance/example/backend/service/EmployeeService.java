package attendance.example.backend.service;

import attendance.example.backend.dto.SignupRequest;
import attendance.example.backend.exception.ApiException;
import attendance.example.backend.model.DeletionRequest;
import attendance.example.backend.model.Employee;
import attendance.example.backend.repository.DeletionRequestRepository;
import attendance.example.backend.repository.EmployeeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class EmployeeService {

    private static final Logger log = LoggerFactory.getLogger(EmployeeService.class);

    private final EmployeeRepository employeeRepository;
    private final DeletionRequestRepository deletionRequestRepository;
    private final NotificationService notificationService;

    public EmployeeService(
            EmployeeRepository employeeRepository,
            DeletionRequestRepository deletionRequestRepository,
            @Lazy NotificationService notificationService
    ) {
        this.employeeRepository = employeeRepository;
        this.deletionRequestRepository = deletionRequestRepository;
        this.notificationService = notificationService;
    }

    public List<Employee> getEmployees() throws Exception {
        List<Employee> employees = new ArrayList<>(employeeRepository.findAll());
        employees.replaceAll(this::sanitize);
        employees.sort(Comparator.comparing(Employee::getFullName, String.CASE_INSENSITIVE_ORDER));
        return employees;
    }

    public Optional<Employee> findById(String id) throws Exception {
        return employeeRepository.findById(id).map(this::sanitize);
    }

    public Employee findByEmployeeId(String employeeId) throws Exception {
        return employeeRepository.findByEmployeeId(normalizeEmployeeId(employeeId))
                .map(this::sanitize)
                .orElse(null);
    }

    public Optional<Employee> findByEmail(String email) throws Exception {
        return employeeRepository.findByEmail(normalizeEmail(email)).map(this::sanitize);
    }

    public Employee createEmployee(String uid, SignupRequest request, String hashedPassword) throws Exception {
        Employee employee = new Employee();
        employee.setId(uid);
        employee.setEmployeeId(resolveEmployeeId(request));
        employee.setFullName(requireText(request.getFullName(), "Full name is required"));
        employee.setDesignation(defaultIfBlank(request.getDesignation(), "Programmer Analyst"));
        employee.setTeam(defaultIfBlank(request.getTeam(), "Platform"));
        employee.setEmail(normalizeEmail(request.getEmail()));
        employee.setCity(defaultIfBlank(request.getCity(), "Bengaluru"));
        employee.setPassword(hashedPassword);
        
        // Validate and set state
        String state = request.getState();
        if (state != null && !state.isBlank()) {
            if (!isValidIndianState(state)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Please select a valid Indian state");
            }
            employee.setState(state.trim());
        } else {
            employee.setState("Karnataka");
        }
        
        employee.setCountry(defaultIfBlank(request.getCountry(), "India"));
        employee.setAvatarColor(defaultIfBlank(request.getAvatarColor(), avatarColorFor(employee.getEmployeeId())));
        employee.setRole(resolveRole(employee.getEmployeeId()));
        employee.setStatus("active");

        Employee saved = sanitize(employeeRepository.save(employee));
        log.info("Employee persisted to MongoDB Atlas — employeeId={}, mongoDocumentId={}",
                saved.getEmployeeId(), saved.getId());
        return saved;
    }

    /**
     * Legacy method for backward compatibility with imports
     */
    public Employee createEmployee(String uid, SignupRequest request) throws Exception {
        throw new ApiException(HttpStatus.BAD_REQUEST, "Password is required for employee creation");
    }

    /**
     * Update employee password in MongoDB
     */
    public void updatePassword(String employeeId, String hashedPassword) throws Exception {
        Employee employee = findById(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Employee not found"));
        employee.setPassword(hashedPassword);
        employeeRepository.save(employee);
    }

    /**
     * Resolves an employee by MongoDB document id ({@code Employee.id}) or business code ({@code Employee.employeeId}, e.g. A3748).
     */
    public Employee requireEmployee(String idOrBusinessEmployeeId) throws Exception {
        if (idOrBusinessEmployeeId == null || idOrBusinessEmployeeId.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Employee identifier is required");
        }
        String key = idOrBusinessEmployeeId.trim();
        Optional<Employee> byMongoId = findById(key);
        if (byMongoId.isPresent()) {
            return byMongoId.get();
        }
        Employee byBusinessId = findByEmployeeId(key);
        if (byBusinessId != null) {
            return byBusinessId;
        }
        throw new ApiException(HttpStatus.NOT_FOUND, "Employee not found");
    }

    /** Canonical MongoDB id used in attendance_records and notifications. */
    public String resolveInternalEmployeeId(String idOrBusinessEmployeeId) throws Exception {
        return requireEmployee(idOrBusinessEmployeeId).getId();
    }

    public void ensureUniqueSignup(SignupRequest request) throws Exception {
        String employeeId = resolveEmployeeId(request);
        if (findByEmployeeId(employeeId) != null) {
            throw new ApiException(HttpStatus.CONFLICT, "Employee ID already exists");
        }
        if (findByEmail(request.getEmail()).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already exists");
        }
    }

    public Optional<DeletionRequest> findDeletionRequestByEmployeeId(String employeeId) throws Exception {
        String normalized = normalizeEmployeeId(employeeId);
        return deletionRequestRepository.findByEmployeeId(normalized);
    }

    public DeletionRequest createDeletionRequest(String employeeId) throws Exception {
        String normalized = normalizeEmployeeId(employeeId);
        Employee employee = findByEmployeeId(normalized);
        if (employee == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Employee not found");
        }

        Optional<DeletionRequest> existing = findDeletionRequestByEmployeeId(normalized);
        if (existing.isPresent()) {
            String status = existing.get().getStatus();
            if ("pending".equalsIgnoreCase(status)) {
                throw new ApiException(HttpStatus.CONFLICT, "A deletion request is already pending");
            }
            if ("approved".equalsIgnoreCase(status)) {
                throw new ApiException(HttpStatus.CONFLICT, "This account has already been approved for deletion");
            }
        }

        DeletionRequest request = new DeletionRequest();
        request.setId(normalized);
        request.setEmployeeId(normalized);
        request.setStatus("pending");
        request.setRequestedAt(Instant.now().toString());
        request.setRequestedBy(normalized);

        deletionRequestRepository.save(request);

        notificationService.createNotification(
                employee.getId(),
                "info",
                "Deletion request sent to admin",
                "Your account deletion request has been submitted and is pending admin approval.",
                "View status",
                "/profile"
        );
        return request;
    }

    public List<DeletionRequest> getPendingDeletionRequests() throws Exception {
        return deletionRequestRepository.findByStatus("pending");
    }

    public DeletionRequest approveDeletionRequest(String employeeId, String reviewerId) throws Exception {
        DeletionRequest request = findDeletionRequestByEmployeeId(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Deletion request not found"));

        if (!"pending".equalsIgnoreCase(request.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only pending requests can be approved");
        }

        request.setStatus("approved");
        request.setReviewedBy(reviewerId);
        request.setReviewedAt(Instant.now().toString());
        deletionRequestRepository.save(request);

        Employee employee = findByEmployeeId(request.getEmployeeId());
        if (employee == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Employee not found");
        }
        employee.setStatus("inactive");
        employeeRepository.save(employee);

        notificationService.createNotification(
                employee.getId(),
                "alert",
                "Deletion request approved",
                "Your account deletion request has been approved by the admin. Your account will be deactivated.",
                null,
                null
        );
        return request;
    }

    public void dismissDeletionRequest(String employeeId) throws Exception {
        DeletionRequest request = findDeletionRequestByEmployeeId(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Deletion request not found"));

        if (!"pending".equalsIgnoreCase(request.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only pending requests can be dismissed");
        }

        request.setStatus("dismissed");
        deletionRequestRepository.save(request);

        Employee employee = findByEmployeeId(request.getEmployeeId());
        if (employee == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Employee not found");
        }

        notificationService.createNotification(
                employee.getId(),
                "info",
                "Deletion request dismissed",
                "Your account deletion request has been dismissed by the admin.",
                null,
                null
        );
    }

    public ImportEmployeeResult upsertImportedEmployee(
            String email,
            String fullName,
            String roleText,
            String employeeId
    ) throws Exception {
        String normalizedEmployeeId = normalizeEmployeeId(employeeId);
        if (!normalizedEmployeeId.matches("^[IA]\\d{4}$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Employee ID must be in format I1234 or A1234");
        }

        String normalizedEmail = normalizeEmail(email);
        String cleanFullName = requireText(fullName, "Full name is required");
        String resolvedRole = resolveImportedRole(roleText, normalizedEmployeeId);

        Employee byEmployeeId = findByEmployeeId(normalizedEmployeeId);
        Employee byEmail = findByEmail(normalizedEmail).orElse(null);

        if (byEmployeeId != null && byEmail != null && !byEmployeeId.getId().equals(byEmail.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Employee ID and email point to different existing employees");
        }

        Employee employee = byEmployeeId != null ? byEmployeeId : byEmail;
        boolean created = employee == null;

        if (employee == null) {
            employee = new Employee();
            employee.setId(UUID.randomUUID().toString());
            employee.setDesignation("Associate");
            employee.setTeam("General");
            employee.setCity("Hyderabad");
            employee.setState("Telangana");
            employee.setCountry("India");
            employee.setAvatarColor(avatarColorFor(normalizedEmployeeId));
        }

        boolean updated = false;
        updated |= assignIfChanged(employee::getEmployeeId, employee::setEmployeeId, normalizedEmployeeId);
        updated |= assignIfChanged(employee::getEmail, employee::setEmail, normalizedEmail);
        updated |= assignIfChanged(employee::getFullName, employee::setFullName, cleanFullName);
        updated |= assignIfChanged(employee::getRole, employee::setRole, resolvedRole);
        updated |= assignIfChanged(employee::getStatus, employee::setStatus, "active");

        if (employee.getDesignation() == null || employee.getDesignation().isBlank()) {
            employee.setDesignation("admin".equals(resolvedRole) ? "Manager" : "Associate");
            updated = true;
        }
        if (employee.getTeam() == null || employee.getTeam().isBlank()) {
            employee.setTeam("General");
            updated = true;
        }
        if (employee.getCity() == null || employee.getCity().isBlank()) {
            employee.setCity("Hyderabad");
            updated = true;
        }
        if (employee.getState() == null || employee.getState().isBlank()) {
            employee.setState("Telangana");
            updated = true;
        }
        if (employee.getCountry() == null || employee.getCountry().isBlank()) {
            employee.setCountry("India");
            updated = true;
        }
        if (employee.getAvatarColor() == null || employee.getAvatarColor().isBlank()) {
            employee.setAvatarColor(avatarColorFor(normalizedEmployeeId));
            updated = true;
        }

        if (created || updated) {
            employeeRepository.save(employee);
        }

        return new ImportEmployeeResult(sanitize(employee), created, !created && updated);
    }

    public record ImportEmployeeResult(Employee employee, boolean created, boolean updated) {
    }

    private boolean isValidIndianState(String state) {
        String[] indianStates = {
                "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
                "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
                "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
                "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
                "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
                "Uttar Pradesh", "Uttarakhand", "West Bengal"
        };
        
        for (String validState : indianStates) {
            if (validState.equalsIgnoreCase(state.trim())) {
                return true;
            }
        }
        return false;
    }

    public String resolveEmployeeId(SignupRequest request) {
        String raw = request.getEmployeeId();
        if (raw == null || raw.isBlank()) {
            raw = request.getEmpId();
        }
        raw = requireText(raw, "Employee ID is required");
        String normalized = normalizeEmployeeId(raw);
        
        // Validate Employee ID format: Ixxxx or Axxxx where x are digits
        if (!normalized.matches("^[IA]\\d{4}$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Employee ID must be in format I1234 or A1234");
        }
        
        return normalized;
    }

    public String resolveRole(String employeeId) {
        return employeeId.toLowerCase(Locale.ROOT).startsWith("admin") ? "admin" : "user";
    }

    public Employee sanitize(Employee employee) {
        if (employee.getRole() == null || employee.getRole().isBlank()) {
            employee.setRole(resolveRole(employee.getEmployeeId()));
        }
        if (employee.getStatus() == null || employee.getStatus().isBlank()) {
            employee.setStatus("active");
        }
        return employee;
    }

    public String normalizeEmployeeId(String employeeId) {
        return requireText(employeeId, "Employee ID is required").toUpperCase(Locale.ROOT);
    }

    public String normalizeEmail(String email) {
        String normalized = requireText(email, "Email is required").toLowerCase(Locale.ROOT);
        
        // Validate email format with @srmtech.com domain
        if (!normalized.matches("^[a-zA-Z0-9._%+-]+@srmtech\\.com$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only srmtech.com email addresses are allowed");
        }
        
        return normalized;
    }

    private String requireText(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private String defaultIfBlank(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }

    private boolean assignIfChanged(java.util.function.Supplier<String> getter,
                                    java.util.function.Consumer<String> setter,
                                    String nextValue) {
        String currentValue = getter.get();
        if (nextValue.equals(currentValue)) {
            return false;
        }
        setter.accept(nextValue);
        return true;
    }

    private String resolveImportedRole(String roleText, String employeeId) {
        String normalizedRole = roleText == null ? "" : roleText.trim().toLowerCase(Locale.ROOT);
        if (normalizedRole.contains("admin")) {
            return "admin";
        }
        if (normalizedRole.contains("employee") || normalizedRole.contains("user")) {
            return "user";
        }
        return resolveRole(employeeId);
    }

    private String avatarColorFor(String employeeId) {
        String[] palette = {
                "#2563EB", "#059669", "#EA580C", "#7C3AED", "#DC2626", "#0F766E"
        };
        int index = Math.abs(employeeId.hashCode()) % palette.length;
        return palette[index];
    }

}
