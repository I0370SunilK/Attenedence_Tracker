package attendance.example.backend.dto;

public class LoginRequest {

    private String empId;
    private String password;

    public LoginRequest() {
    }

    public String getEmpId() {
        return empId;
    }

    public void setEmpId(String empId) {
        this.empId = empId;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
