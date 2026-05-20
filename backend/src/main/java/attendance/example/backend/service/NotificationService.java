package attendance.example.backend.service;

import attendance.example.backend.model.Notification;
import attendance.example.backend.repository.NotificationRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public List<Notification> getNotificationsByEmployee(String employeeId) throws Exception {
        List<Notification> list = new ArrayList<>(notificationRepository.findByEmployeeId(employeeId));
        list.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        if (list.size() > 50) {
            list = list.subList(0, 50);
        }
        return list;
    }

    public List<Notification> getUnreadNotificationsByEmployee(String employeeId) throws Exception {
        List<Notification> list = new ArrayList<>(notificationRepository.findByEmployeeIdAndReadFalse(employeeId));
        list.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        return list;
    }

    public Notification createNotification(String employeeId, String type, String title, String message,
                                            String actionLabel, String actionRoute) throws Exception {
        Notification notification = new Notification();
        notification.setEmployeeId(employeeId);
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

    public void markAllAsRead(String employeeId) throws Exception {
        List<Notification> unreadNotifications = notificationRepository.findByEmployeeIdAndReadFalse(employeeId);
        for (Notification notification : unreadNotifications) {
            notification.setRead(true);
        }
        notificationRepository.saveAll(unreadNotifications);
    }
}
