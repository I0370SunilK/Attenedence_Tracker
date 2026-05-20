package attendance.example.backend.controller;

import attendance.example.backend.model.Notification;
import attendance.example.backend.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final attendance.example.backend.service.AuthService authService;

    public NotificationController(NotificationService notificationService,
                                   attendance.example.backend.service.AuthService authService) {
        this.notificationService = notificationService;
        this.authService = authService;
    }

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(HttpServletRequest request) throws Exception {
        var employee = authService.getCurrentUser(request);
        if (employee == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(notificationService.getNotificationsByEmployee(employee.getId()));
    }

    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(HttpServletRequest request) throws Exception {
        var employee = authService.getCurrentUser(request);
        if (employee == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(notificationService.getUnreadNotificationsByEmployee(employee.getId()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable String id) throws Exception {
        notificationService.markAsRead(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(HttpServletRequest request) throws Exception {
        var employee = authService.getCurrentUser(request);
        if (employee == null) {
            return ResponseEntity.status(401).build();
        }
        notificationService.markAllAsRead(employee.getId());
        return ResponseEntity.noContent().build();
    }
}