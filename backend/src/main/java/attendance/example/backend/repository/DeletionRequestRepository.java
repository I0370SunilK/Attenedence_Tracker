package attendance.example.backend.repository;

import attendance.example.backend.model.DeletionRequest;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface DeletionRequestRepository extends MongoRepository<DeletionRequest, String> {

    Optional<DeletionRequest> findByEmployeeId(String employeeId);

    List<DeletionRequest> findByStatus(String status);
}
