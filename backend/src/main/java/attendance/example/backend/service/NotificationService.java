package attendance.example.backend.service;

import attendance.example.backend.model.Notification;
import attendance.example.backend.repository.NotificationRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmployeeService employeeService;

    public NotificationService(NotificationRepository notificationRepository, EmployeeService employeeService) {
        this.notificationRepository = notificationRepository;
        this.employeeService = employeeService;
    }

    public List<Notification> getNotificationsByEmployee(String employeeKey) throws Exception {
        String internalId = employeeService.resolveInternalEmployeeId(employeeKey);
        List<Notification> list = new ArrayList<>(notificationRepository.findByEmployeeId(internalId));
        list.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        if (list.size() > 50) {
            list = list.subList(0, 50);
        }
        return list;
    }

    public List<Notification> getUnreadNotificationsByEmployee(String employeeKey) throws Exception {
        String internalId = employeeService.resolveInternalEmployeeId(employeeKey);
        List<Notification> list = new ArrayList<>(notificationRepository.findByEmployeeIdAndReadFalse(internalId));
        list.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        return list;
    }

    public Notification createNotification(String employeeKey, String type, String title, String message,
                                            String actionLabel, String actionRoute) throws Exception {
        String internalId = employeeService.resolveInternalEmployeeId(employeeKey);
        Notification notification = new Notification();
        notification.setEmployeeId(internalId);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setCreatedAt(Instant.now().toString());
        notification.setRead(false);
        notification.setActionLabel(actionLabel);
        notification.setActionRoute(actionRoute);

        return notificationRepository.save(notification);
    }

    public void markAsRead(String notificationId) throws Exception {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            notification.setRead(true);
            notificationRepository.save(notification);
        });
    }

    public void markAllAsRead(String employeeKey) throws Exception {
        String internalId = employeeService.resolveInternalEmployeeId(employeeKey);
        List<Notification> unreadNotifications = notificationRepository.findByEmployeeIdAndReadFalse(internalId);
        for (Notification notification : unreadNotifications) {
            notification.setRead(true);
        }
        notificationRepository.saveAll(unreadNotifications);
    }
}
