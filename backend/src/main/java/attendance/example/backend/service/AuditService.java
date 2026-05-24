package attendance.example.backend.service;

import attendance.example.backend.model.AuditLog;
import attendance.example.backend.model.Employee;
import attendance.example.backend.repository.AuditLogRepository;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Service for logging admin actions to the audit_logs collection in MongoDB.
 * Provides a reusable method to log any admin action with relevant details.
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Log an admin action to the audit_logs collection.
     *
     * @param admin            The admin employee performing the action
     * @param action           The action type (e.g., UPDATE_EMPLOYEE, DELETE_EMPLOYEE, ROLE_CHANGED, etc.)
     * @param description      Human-readable description of the action
     * @param targetEmployeeId The target employee ID affected by the action (can be null)
     * @param request          The HTTP request (used to extract IP address, can be null)
     */
    public void logAction(Employee admin, String action, String description, 
                          String targetEmployeeId, HttpServletRequest request) {
        try {
            String ipAddress = extractIpAddress(request);
            
            AuditLog auditLog = new AuditLog(
                admin.getId(),
                admin.getFullName(),
                admin.getEmail(),
                action,
                description,
                targetEmployeeId,
                ipAddress
            );
            auditLog.setId(UUID.randomUUID().toString());
            
            auditLogRepository.save(auditLog);
            
            log.info("Audit log saved: admin={} action={} target={}", 
                     admin.getEmployeeId(), action, targetEmployeeId);
        } catch (Exception e) {
            log.error("Failed to save audit log: {}", e.getMessage(), e);
        }
    }

    /**
     * Extract client IP address from the request.
     */
    private String extractIpAddress(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
            return ip.split(",")[0].trim();
        }
        
        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
            return ip.trim();
        }
        
        return request.getRemoteAddr();
    }
}