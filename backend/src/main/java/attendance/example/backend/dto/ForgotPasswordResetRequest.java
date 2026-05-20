package attendance.example.backend.dto;

public class ForgotPasswordResetRequest {
    private String email;
    private String newPassword;

    public ForgotPasswordResetRequest() {}

    public ForgotPasswordResetRequest(String email, String newPassword) {
        this.email = email;
        this.newPassword = newPassword;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }
}