package attendance.example.backend.service;

import attendance.example.backend.dto.AuthResponse;
import attendance.example.backend.dto.CheckEmailRequest;
import attendance.example.backend.dto.ForgotPasswordResetRequest;
import attendance.example.backend.dto.LoginRequest;
import attendance.example.backend.dto.PasswordChangeRequest;
import attendance.example.backend.dto.ProfileUpdateRequest;
import attendance.example.backend.dto.SignupRequest;
import attendance.example.backend.exception.ApiException;
import attendance.example.backend.model.Employee;
import attendance.example.backend.util.PasswordEncoder;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Locale;
import java.util.UUID;

/**
 * Authentication Service
 * Handles user signup, login, password changes and session management
 * Uses MongoDB for user storage and local password hashing with PBKDF2
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String SESSION_COOKIE = "att_session_uid";
    private static final String HARDCODED_ADMIN_SESSION_ID = "hardcoded-admin";

    private final EmployeeService employeeService;
    private final NotificationService notificationService;
    private final String hardcodedAdminEmployeeId;
    private final String hardcodedAdminPassword;
    private final String hardcodedAdminRecoveryEmail;
    private final boolean sessionCookieSecure;

    public AuthService(
            EmployeeService employeeService,
            NotificationService notificationService,
            @Value("${app.admin.employee-id:Admin323}") String hardcodedAdminEmployeeId,
            @Value("${app.admin.password:Admin@srmtech25}") String hardcodedAdminPassword,
            @Value("${app.admin.recovery-email:karivilla.sunil@srmtech.com}") String hardcodedAdminRecoveryEmail,
            @Value("${app.session.cookie-secure:false}") boolean sessionCookieSecure
    ) {
        this.employeeService = employeeService;
        this.notificationService = notificationService;
        this.hardcodedAdminEmployeeId = hardcodedAdminEmployeeId;
        this.hardcodedAdminPassword = hardcodedAdminPassword;
        this.hardcodedAdminRecoveryEmail = hardcodedAdminRecoveryEmail;
        this.sessionCookieSecure = sessionCookieSecure;
    }

    /**
     * Sign up a new employee
     * Validates input, creates employee in MongoDB with hashed password
     */
    public AuthResponse signup(SignupRequest request, HttpServletResponse response) throws Exception {

        validateSignup(request);

        employeeService.ensureUniqueSignup(request);

        // Hash the password before storing
        String hashedPassword = PasswordEncoder.encode(request.getPassword());

        // Create employee with hashed password
        Employee employee = employeeService.createEmployee(
                UUID.randomUUID().toString(),
                request,
                hashedPassword
        );

        writeSessionCookie(response, employee.getId());

        return new AuthResponse(employee, employee.getRole());
    }

    /**
     * Login user with employee ID and password
     * Verifies credentials against MongoDB
     */
    public AuthResponse login(LoginRequest request, HttpServletResponse response) throws Exception{

        String employeeId = employeeService.normalizeEmployeeId(request.getEmpId());
        String password = requirePassword(request.getPassword());

        // Check hardcoded admin login
        if (isHardcodedAdminLogin(employeeId, password)) {
            Employee adminUser = buildHardcodedAdminUser();
            writeSessionCookie(response, HARDCODED_ADMIN_SESSION_ID);
            return new AuthResponse(adminUser, "admin");
        }

        // Find employee by employee ID
        Employee employee = employeeService.findByEmployeeId(employeeId);
        if (employee == null) {
            log.info("Login failed: employeeId={} not found", employeeId);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid employee ID or password");
        }

        if (employee.getStatus() != null && employee.getStatus().equalsIgnoreCase("inactive")) {
            log.info("Login failed: employeeId={} is inactive", employeeId);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Account has been removed or deactivated");
        }

        // Verify password using local hashing
        if (!PasswordEncoder.matches(password, employee.getPassword())) {
            log.info("Login failed: password mismatch for employeeId={}", employeeId);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid employee ID or password");
        }

        writeSessionCookie(response, employee.getId());

        return new AuthResponse(employee, employee.getRole());
    }

    /**
     * Get currently logged-in user from session cookie
     */
    public Employee getCurrentUser(HttpServletRequest request) throws Exception {

        String employeeId = readSessionCookie(request);

        if (employeeId == null || employeeId.isBlank()) {
            return null;
        }

        if (HARDCODED_ADMIN_SESSION_ID.equals(employeeId)) {
            return buildHardcodedAdminUser();
        }

        Employee employee = employeeService.findById(employeeId).orElse(null);
        if (employee != null && "inactive".equalsIgnoreCase(employee.getStatus())) {
            return null;
        }
        return employee;
    }

    /**
     * Logout user by clearing session cookie
     */
    public void logout(HttpServletResponse response) {

        Cookie cookie = new Cookie(SESSION_COOKIE, "");

        cookie.setHttpOnly(true);
        cookie.setSecure(sessionCookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(0);

        response.addCookie(cookie);
    }

    /**
     * Check if email exists in database
     */
    public boolean checkEmailExists(CheckEmailRequest request) throws Exception {
        if (request == null || request.getEmail() == null || request.getEmail().isBlank()) {
            return false;
        }
        String email = employeeService.normalizeEmail(request.getEmail());
        return employeeService.findByEmail(email).isPresent();
    }

    /**
     * Reset password via forgot password flow
     * Updates password in MongoDB
     */
    public void forgotPasswordReset(ForgotPasswordResetRequest request) throws Exception {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Request payload is required");
        }
        String email = requireText(request.getEmail(), "Email is required");
        String newPassword = requirePassword(request.getNewPassword());

        String normalizedEmail = employeeService.normalizeEmail(email);
        Employee employee = employeeService.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Employee not found with this email"));

        if (employee.getStatus() != null && employee.getStatus().equalsIgnoreCase("inactive")) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Account has been removed or deactivated");
        }

        // Hash new password and update in MongoDB
        String hashedPassword = PasswordEncoder.encode(newPassword);
        employeeService.updatePassword(employee.getId(), hashedPassword);

        notificationService.createNotification(
                employee.getId(),
                "success",
                "Password reset successfully",
                "Your password has been reset via forgot password option.",
                null,
                null
        );
    }

    /**
     * Change password for logged-in user
     * Verifies current password and updates with new hashed password
     */
    public void changePassword(HttpServletRequest request, PasswordChangeRequest payload) throws Exception {
        if (payload == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password change payload is required");
        }

        String currentPassword = requireText(payload.getCurrentPassword(), "Current password is required");
        String newPassword = requirePassword(payload.getNewPassword());

        String sessionEmployeeId = readSessionCookie(request);
        if (sessionEmployeeId == null || sessionEmployeeId.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }

        if (HARDCODED_ADMIN_SESSION_ID.equals(sessionEmployeeId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password change is not supported for this account");
        }

        Employee employee = employeeService.requireEmployee(sessionEmployeeId);
        if (employee.getStatus() != null && employee.getStatus().equalsIgnoreCase("inactive")) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Account has been removed or deactivated");
        }

        // Verify current password
        if (!PasswordEncoder.matches(currentPassword, employee.getPassword())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid current password");
        }

        // Hash new password and update in MongoDB
        String hashedPassword = PasswordEncoder.encode(newPassword);
        employeeService.updatePassword(employee.getId(), hashedPassword);

        notificationService.createNotification(
                employee.getId(),
                "success",
                "Password changed successfully",
                "Your account password has been updated.",
                null,
                null
        );
    }

    public Employee updateProfile(HttpServletRequest request, ProfileUpdateRequest payload) throws Exception {
        String sessionEmployeeId = readSessionCookie(request);
        if (sessionEmployeeId == null || sessionEmployeeId.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }

        if (HARDCODED_ADMIN_SESSION_ID.equals(sessionEmployeeId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Profile update is not supported for this account");
        }

        Employee employee = employeeService.requireEmployee(sessionEmployeeId);
        if (employee.getStatus() != null && employee.getStatus().equalsIgnoreCase("inactive")) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Account has been removed or deactivated");
        }

        return employeeService.updateProfile(employee.getId(), payload);
    }

    // ==================== Private Helper Methods ====================

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

    private void validateSignup(SignupRequest request) {

        if (request == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Signup payload is required"
            );
        }

        if (request.getFullName() == null
                || request.getFullName().trim().isEmpty()) {

            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Full name is required"
            );
        }

        // Validate Employee ID format: Ixxxx or Axxxx where x are digits
        String empId = request.getEmpId() != null ? request.getEmpId().trim().toUpperCase() : "";
        if (empId.isEmpty()) {
            empId = request.getEmployeeId() != null ? request.getEmployeeId().trim().toUpperCase() : "";
        }
        
        if (empId.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Employee ID is required"
            );
        }
        
        if (!empId.matches("^[IA]\\d{4}$")) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Employee ID must be in format I1234 or A1234"
            );
        }

        // Validate email domain
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        if (email.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Email is required"
            );
        }
        
        if (!email.matches("^[a-zA-Z0-9._%+-]+@srmtech\\.com$")) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Only srmtech.com email addresses are allowed"
            );
        }

        // Validate state
        String state = request.getState() != null ? request.getState().trim() : "";
        if (!state.isEmpty() && !isValidIndianState(state)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Please select a valid Indian state"
            );
        }

        requirePassword(request.getPassword());
    }

    private String requirePassword(String password) {

        if (password == null || password.isBlank()) {

            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Password is required"
            );
        }

        if (!password.matches(
                "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).{8,}$"
        )) {

            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Password must be at least 8 characters and include uppercase, lowercase, number and special character"
            );
        }

        return password;
    }

    private String requireText(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private void writeSessionCookie(
            HttpServletResponse response,
            String employeeUid
    ) {

        Cookie cookie = new Cookie(SESSION_COOKIE, employeeUid);

        cookie.setHttpOnly(true);
        cookie.setSecure(sessionCookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(60 * 60 * 24 * 7);

        response.addCookie(cookie);
    }

    private String readSessionCookie(HttpServletRequest request) {

        Cookie[] cookies = request.getCookies();

        if (cookies == null) {
            return null;
        }

        for (Cookie cookie : cookies) {

            if (SESSION_COOKIE.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }

        return null;
    }

    private boolean isHardcodedAdminLogin(String employeeId, String password) {
        return hardcodedAdminEmployeeId.equalsIgnoreCase(employeeId)
                && hardcodedAdminPassword.equals(password);
    }

    private Employee buildHardcodedAdminUser() {
        Employee employee = new Employee();
        employee.setId(HARDCODED_ADMIN_SESSION_ID);
        employee.setEmployeeId(hardcodedAdminEmployeeId.toUpperCase(Locale.ROOT));
        employee.setFullName("System Administrator");
        employee.setDesignation("Manager");
        employee.setTeam("Administration");
        employee.setEmail(hardcodedAdminRecoveryEmail);
        employee.setCity("Chennai");
        employee.setState("Tamil Nadu");
        employee.setCountry("India");
        employee.setAvatarColor("#DC2626");
        employee.setRole("admin");
        return employee;
    }
}
