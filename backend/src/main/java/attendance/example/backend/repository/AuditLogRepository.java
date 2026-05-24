package attendance.example.backend.repository;

import attendance.example.backend.model.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {

    List<AuditLog> findByAdminIdOrderByTimestampDesc(String adminId);

    List<AuditLog> findAllByOrderByTimestampDesc();
}