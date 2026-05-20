package attendance.example.backend.dto;

public class MonthlyDetailsResponse {

    private String date;
    private String day;
    private String status;

    public MonthlyDetailsResponse() {
    }

    public MonthlyDetailsResponse(String date, String day, String status) {
        this.date = date;
        this.day = day;
        this.status = status;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getDay() {
        return day;
    }

    public void setDay(String day) {
        this.day = day;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
