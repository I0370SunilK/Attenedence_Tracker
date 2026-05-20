package attendance.example.backend.dto;

import attendance.example.backend.model.Employee;

public class AuthResponse {

    private Employee user;
    private String role;

    public AuthResponse() {
    }

    public AuthResponse(Employee user, String role) {
        this.user = user;
        this.role = role;
    }

    public Employee getUser() {
        return user;
    }

    public void setUser(Employee user) {
        this.user = user;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
