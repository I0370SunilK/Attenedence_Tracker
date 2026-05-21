package attendance.example.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("attendance_records")
public class AttendanceRecord {

    @Id
    private String id;
    /** MongoDB {@link attendance.example.backend.model.Employee#id}, NOT the business code (e.g. A3748). */
    private String employeeId;
    private String date;
    private String status;
    private String markedAt;
    private Boolean edited;

    public AttendanceRecord() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMarkedAt() {
        return markedAt;
    }

    public void setMarkedAt(String markedAt) {
        this.markedAt = markedAt;
    }

    public Boolean getEdited() {
        return edited;
    }

    public void setEdited(Boolean edited) {
        this.edited = edited;
    }
}
