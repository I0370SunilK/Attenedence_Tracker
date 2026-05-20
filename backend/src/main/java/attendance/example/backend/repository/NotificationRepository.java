package attendance.example.backend.repository;

import attendance.example.backend.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {

    List<Notification> findByEmployeeId(String employeeId);

    List<Notification> findByEmployeeIdAndReadFalse(String employeeId);
}
