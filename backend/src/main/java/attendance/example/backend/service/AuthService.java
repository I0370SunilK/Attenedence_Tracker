package attendance.example.backend.service;

import attendance.example.backend.dto.AuthResponse;
import attendance.example.backend.dto.CheckEmailRequest;
import attendance.example.backend.dto.ForgotPasswordResetRequest;
import attendance.example.backend.dto.LoginRequest;
import attendance.example.backend.dto.PasswordChangeRequest;
import attendance.example.backend.dto.SignupRequest;
import attendance.example.backend.exception.ApiException;
import attendance.example.backend.model.Employee;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.UserRecord;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class AuthService {

    private static final String SESSION_COOKIE = "att_session_uid";
    private static final String HARDCODED_ADMIN_SESSION_ID = "hardcoded-admin";

    private final EmployeeService employeeService;
    private final NotificationService notificationService;
    private final String firebaseWebApiKey;
    private final String hardcodedAdminEmployeeId;
    private final String hardcodedAdminPassword;
    private final String hardcodedAdminRecoveryEmail;

    public AuthService(
            EmployeeService employeeService,
            NotificationService notificationService,
            @Value("${firebase.web-api-key}") String firebaseWebApiKey,
            @Value("${app.admin.employee-id:Admin323}") String hardcodedAdminEmployeeId,
            @Value("${app.admin.password:Admin@srmap}") String hardcodedAdminPassword,
            @Value("${app.admin.recovery-email:karivilla.sunil@srmtech.com}") String hardcodedAdminRecoveryEmail
    ) {
        this.employeeService = employeeService;
        this.notificationService = notificationService;
        this.firebaseWebApiKey = firebaseWebApiKey;
        this.hardcodedAdminEmployeeId = hardcodedAdminEmployeeId;
        this.hardcodedAdminPassword = hardcodedAdminPassword;
        this.hardcodedAdminRecoveryEmail = hardcodedAdminRecoveryEmail;
    }

    public AuthResponse signup(SignupRequest request, HttpServletResponse response) throws Exception {

        validateSignup(request);

        employeeService.ensureUniqueSignup(request);

        UserRecord userRecord = FirebaseAuth.getInstance().createUser(
                new UserRecord.CreateRequest()
                        .setEmail(employeeService.normalizeEmail(request.getEmail()))
                        .setPassword(request.getPassword())
        );

        Employee employee = employeeService.createEmployee(
                userRecord.getUid(),
                request
        );

        writeSessionCookie(response, employee.getId());

        return new AuthResponse(employee, employee.getRole());
    }

    public AuthResponse login(LoginRequest request, HttpServletResponse response) throws Exception{

        String employeeId =
                employeeService.normalizeEmployeeId(request.getEmpId());

        String password = requirePassword(request.getPassword());

        if (isHardcodedAdminLogin(employeeId, password)) {
            Employee adminUser = buildHardcodedAdminUser();
            writeSessionCookie(response, HARDCODED_ADMIN_SESSION_ID);
            return new AuthResponse(adminUser, "admin");
        }

        Employee employee = employeeService.findByEmployeeId(employeeId);
        if (employee == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid employee ID or password");
        }

        if (employee.getStatus() != null && employee.getStatus().equalsIgnoreCase("inactive")) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Account has been removed or deactivated");
        }

        verifyFirebasePassword(employee.getEmail(), password);

        writeSessionCookie(response, employee.getId());

        return new AuthResponse(employee, employee.getRole());
    }

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

    public void logout(HttpServletResponse response) {

        Cookie cookie = new Cookie(SESSION_COOKIE, "");

        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);

        response.addCookie(cookie);
    }

    public boolean checkEmailExists(CheckEmailRequest request) throws Exception {
        if (request == null || request.getEmail() == null || request.getEmail().isBlank()) {
            return false;
        }
        String email = employeeService.normalizeEmail(request.getEmail());
        return employeeService.findByEmail(email).isPresent();
    }

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

        FirebaseAuth.getInstance().updateUser(
                new UserRecord.UpdateRequest(employee.getId()).setPassword(newPassword)
        );

        notificationService.createNotification(
                employee.getId(),
                "success",
                "Password reset successfully",
                "Your password has been reset via forgot password option.",
                null,
                null
        );
    }

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

        try {
            verifyFirebasePassword(employee.getEmail(), currentPassword);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid current password");
        }

        FirebaseAuth.getInstance().updateUser(
                new UserRecord.UpdateRequest(employee.getId()).setPassword(newPassword)
        );

        notificationService.createNotification(
                employee.getId(),
                "success",
                "Password changed successfully",
                "Your account password has been updated.",
                null,
                null
        );
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

    private void verifyFirebasePassword(String email, String password) {

        try {

            String url =
                    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key="
                            + firebaseWebApiKey;

            RestTemplate restTemplate = new RestTemplate();

            Map<String, Object> body = new HashMap<>();

            body.put("email", email.toLowerCase(Locale.ROOT));
            body.put("password", password);
            body.put("returnSecureToken", true);

            HttpHeaders headers = new HttpHeaders();

            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request =
                    new HttpEntity<>(body, headers);

            ResponseEntity<String> response =
                    restTemplate.postForEntity(
                            url,
                            request,
                            String.class
                    );

            if (!response.getStatusCode().is2xxSuccessful()) {

                throw new ApiException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid employee ID or password"
                );
            }

        } catch (Exception e) {

            e.printStackTrace();

            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid employee ID or password"
            );
        }
    }

    private void writeSessionCookie(
            HttpServletResponse response,
            String employeeUid
    ) {

        Cookie cookie = new Cookie(SESSION_COOKIE, employeeUid);

        cookie.setHttpOnly(true);
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