package attendance.example.backend.controller;

import attendance.example.backend.exception.ApiException;
import attendance.example.backend.model.DeletionRequest;
import attendance.example.backend.model.Employee;
import attendance.example.backend.service.AuditService;
import attendance.example.backend.service.EmployeeDetailsImportService;
import attendance.example.backend.service.EmployeeService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeDetailsImportService employeeDetailsImportService;
    private final AuditService auditService;

    public EmployeeController(EmployeeService employeeService,
                              EmployeeDetailsImportService employeeDetailsImportService,
                              AuditService auditService) {
        this.employeeService = employeeService;
        this.employeeDetailsImportService = employeeDetailsImportService;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<Employee>> getEmployees() throws Exception {
        return ResponseEntity.ok(employeeService.getEmployees());
    }

    @GetMapping("/{employeeId}/deletion-request")
    public ResponseEntity<DeletionRequest> getDeletionRequest(@PathVariable String employeeId) throws Exception {
        return ResponseEntity.ok(employeeService.findDeletionRequestByEmployeeId(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Deletion request not found")));
    }

    @PostMapping("/{employeeId}/deletion-request")
    public ResponseEntity<DeletionRequest> createDeletionRequest(@PathVariable String employeeId) throws Exception {
        return ResponseEntity.ok(employeeService.createDeletionRequest(employeeId));
    }

    @GetMapping("/deletion-requests")
    public ResponseEntity<List<DeletionRequest>> getPendingDeletionRequests() throws Exception {
        return ResponseEntity.ok(employeeService.getPendingDeletionRequests());
    }

    @PostMapping(value = "/import-details", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> importEmployeeDetails(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "preview", defaultValue = "false") boolean preview,
            HttpServletRequest request
    ) throws Exception {
        // Verify admin access
        Employee admin = verifyAdminAccess(request);
        
        if (preview) {
            return ResponseEntity.ok(employeeDetailsImportService.previewEmployeeDetailsFile(file));
        }
        
        var result = employeeDetailsImportService.importEmployeeDetailsFile(file);
        
        // Audit log: import employee details
        auditService.logAction(
            admin,
            "IMPORT_EMPLOYEE_DETAILS",
            "Imported employee details from file: " + file.getOriginalFilename(),
            null,
            request
        );
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/deletion-requests/{employeeId}/approve")
    public ResponseEntity<DeletionRequest> approveDeletionRequest(
            @PathVariable String employeeId,
            HttpServletRequest request
    ) throws Exception {
        // Verify admin access
        Employee admin = verifyAdminAccess(request);
        
        DeletionRequest deletionRequest = employeeService.approveDeletionRequest(employeeId, admin.getId());
        
        // Audit log: approve deletion request
        auditService.logAction(
            admin,
            "APPROVE_DELETION",
            "Approved deletion request for employee: " + employeeId,
            employeeId,
            request
        );
        
        return ResponseEntity.ok(deletionRequest);
    }

    @PostMapping("/deletion-requests/{employeeId}/dismiss")
    public ResponseEntity<Void> dismissDeletionRequest(
            @PathVariable String employeeId,
            HttpServletRequest request
    ) throws Exception {
        // Verify admin access
        Employee admin = verifyAdminAccess(request);
        
        employeeService.dismissDeletionRequest(employeeId);
        
        // Audit log: dismiss deletion request
        auditService.logAction(
            admin,
            "DISMISS_DELETION",
            "Dismissed deletion request for employee: " + employeeId,
            employeeId,
            request
        );
        
        return ResponseEntity.noContent().build();
    }

    /**
     * Verifies that the current session user is an admin.
     * Throws 403 Forbidden if not authenticated or not admin.
     */
    private Employee verifyAdminAccess(HttpServletRequest request) throws Exception {
        // Read the session cookie to find the employee
        // We need access to the session. Let's use a helper method from auth service.
        // Since we don't inject AuthService (to avoid circular deps), we check from EmployeeService
        String employeeId = readSessionCookie(request);
        if (employeeId == null || employeeId.isBlank()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        
        Employee employee = employeeService.findById(employeeId).orElse(null);
        if (employee == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        
        if (!"admin".equalsIgnoreCase(employee.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        
        return employee;
    }
    
    private String readSessionCookie(HttpServletRequest request) {
        jakarta.servlet.http.Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (jakarta.servlet.http.Cookie cookie : cookies) {
            if ("att_session_uid".equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}