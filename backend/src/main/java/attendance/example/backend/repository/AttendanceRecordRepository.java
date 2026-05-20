package attendance.example.backend.repository;

import attendance.example.backend.model.AttendanceRecord;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface AttendanceRecordRepository extends MongoRepository<AttendanceRecord, String> {

    List<AttendanceRecord> findByEmployeeId(String employeeId);

    List<AttendanceRecord> findByEmployeeIdAndDateGreaterThanEqual(String employeeId, String from);

    List<AttendanceRecord> findByEmployeeIdAndDateLessThanEqual(String employeeId, String to);

    List<AttendanceRecord> findByEmployeeIdAndDateGreaterThanEqualAndDateLessThanEqual(String employeeId, String from, String to);

    Optional<AttendanceRecord> findByEmployeeIdAndDate(String employeeId, String date);
}
