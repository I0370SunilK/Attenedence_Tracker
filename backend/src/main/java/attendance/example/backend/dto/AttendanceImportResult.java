package attendance.example.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class AttendanceImportResult {

    private String mode;
    private int month;
    private int year;
    private int totalEmployeesProcessed;
    private int totalAttendanceCells;
    private int newRecords;
    private int updatedRecords;
    private int sameRecords;
    private int skippedRecords;
    private int invalidRecords;
    private int failedRecords;
    private long processingTimeMs;
    private List<String> errors = new ArrayList<>();
    private List<AttendanceImportPreviewRow> previewRows = new ArrayList<>();
    private boolean success;
    private String summary;

    public AttendanceImportResult() {
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public int getMonth() {
        return month;
    }

    public void setMonth(int month) {
        this.month = month;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public int getTotalEmployeesProcessed() {
        return totalEmployeesProcessed;
    }

    public void setTotalEmployeesProcessed(int totalEmployeesProcessed) {
        this.totalEmployeesProcessed = totalEmployeesProcessed;
    }

    public int getTotalAttendanceCells() {
        return totalAttendanceCells;
    }

    public void setTotalAttendanceCells(int totalAttendanceCells) {
        this.totalAttendanceCells = totalAttendanceCells;
    }

    public int getNewRecords() {
        return newRecords;
    }

    public void setNewRecords(int newRecords) {
        this.newRecords = newRecords;
    }

    public int getUpdatedRecords() {
        return updatedRecords;
    }

    public void setUpdatedRecords(int updatedRecords) {
        this.updatedRecords = updatedRecords;
    }

    public int getSameRecords() {
        return sameRecords;
    }

    public void setSameRecords(int sameRecords) {
        this.sameRecords = sameRecords;
    }

    public int getSkippedRecords() {
        return skippedRecords;
    }

    public void setSkippedRecords(int skippedRecords) {
        this.skippedRecords = skippedRecords;
    }

    public int getInvalidRecords() {
        return invalidRecords;
    }

    public void setInvalidRecords(int invalidRecords) {
        this.invalidRecords = invalidRecords;
    }

    public int getFailedRecords() {
        return failedRecords;
    }

    public void setFailedRecords(int failedRecords) {
        this.failedRecords = failedRecords;
    }

    public long getProcessingTimeMs() {
        return processingTimeMs;
    }

    public void setProcessingTimeMs(long processingTimeMs) {
        this.processingTimeMs = processingTimeMs;
    }

    public List<String> getErrors() {
        return errors;
    }

    public void setErrors(List<String> errors) {
        this.errors = errors;
    }

    public List<AttendanceImportPreviewRow> getPreviewRows() {
        return previewRows;
    }

    public void setPreviewRows(List<AttendanceImportPreviewRow> previewRows) {
        this.previewRows = previewRows;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }
}
