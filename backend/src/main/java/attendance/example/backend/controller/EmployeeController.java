package attendance.example.backend.controller;

import attendance.example.backend.exception.ApiException;
import attendance.example.backend.model.DeletionRequest;
import attendance.example.backend.model.Employee;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import attendance.example.backend.service.EmployeeDetailsImportService;
import attendance.example.backend.service.EmployeeService;
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

    public EmployeeController(EmployeeService employeeService,
                              EmployeeDetailsImportService employeeDetailsImportService) {
        this.employeeService = employeeService;
        this.employeeDetailsImportService = employeeDetailsImportService;
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
            @RequestParam("file") MultipartFile file
    ) throws Exception {
        return ResponseEntity.ok(employeeDetailsImportService.importEmployeeDetailsFile(file));
    }

    @PostMapping("/deletion-requests/{employeeId}/approve")
    public ResponseEntity<DeletionRequest> approveDeletionRequest(@PathVariable String employeeId) throws Exception {
        return ResponseEntity.ok(employeeService.approveDeletionRequest(employeeId, "admin"));
    }

    @PostMapping("/deletion-requests/{employeeId}/dismiss")
    public ResponseEntity<Void> dismissDeletionRequest(@PathVariable String employeeId) throws Exception {
        employeeService.dismissDeletionRequest(employeeId);
        return ResponseEntity.noContent().build();
    }
}
