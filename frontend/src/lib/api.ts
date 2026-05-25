import { Employee, AttendanceRecord, DeletionRequest } from "./types";

// On Render with Nginx proxy, API calls should be same-origin (empty string).
// For local dev, set VITE_API_BASE_URL in frontend/.env or docker-compose override.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...opts,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    let message: string;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      message = parsed.message || `API request failed: ${response.status}`;
    } catch {
      message = text || `API request failed: ${response.status}`;
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export async function fetchCurrentUser(): Promise<Employee | null> {
  return (await request<Employee | null | undefined>("/api/auth/me")) ?? null;
}

export async function loginUser(empId: string, password: string): Promise<{ user: Employee; role: "user" | "admin" }> {
  return request(`/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ empId, password }),
  });
}

export async function signupUser(payload: Partial<Employee> & { password: string }): Promise<{ user: Employee; role: "user" | "admin" }> {
  return request(`/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function logoutUser(): Promise<void> {
  return request<void>(`/api/auth/logout`, {
    method: "POST",
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return request<void>(`/api/auth/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function updateProfile(payload: Pick<Employee, "designation" | "team" | "email" | "city">): Promise<Employee> {
  return request<Employee>(`/api/auth/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const result = await request<{ exists: boolean }>(`/api/auth/check-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return result.exists;
}

export async function forgotPasswordReset(email: string, newPassword: string): Promise<void> {
  return request<void>(`/api/auth/forgot-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, newPassword }),
  });
}

export async function getEmployees(): Promise<Employee[]> {
  return request<Employee[]>("/api/employees");
}

export interface EmployeeDetailsImportResult {
  mode?: "preview" | "import";
  fileType?: string;
  totalRows?: number;
  validRows?: number;
  createdEmployees: string[];
  updatedEmployees: string[];
  skippedEmployees: string[];
  previewRows?: Array<{
    rowNumber: string;
    employeeId: string;
    fullName: string;
    team: string;
    email: string;
  }>;
  errors: string[];
  success: boolean;
}

export type AttendanceImportMode = "preview" | "dry-run" | "sync" | "replace-month";

export interface AttendanceImportPreviewRow {
  rowNumber: number;
  employeeId: string;
  employeeName: string;
  projectTeam: string;
  date: string;
  existingValue: string;
  excelValue: string;
  action: string;
}

export interface AttendanceImportResult {
  mode?: AttendanceImportMode;
  month?: number;
  year?: number;
  totalEmployeesProcessed?: number;
  totalAttendanceCells?: number;
  newRecords?: number;
  updatedRecords?: number;
  sameRecords?: number;
  skippedRecords?: number;
  invalidRecords?: number;
  failedRecords?: number;
  processingTimeMs?: number;
  errors: string[];
  previewRows?: AttendanceImportPreviewRow[];
  success: boolean;
  summary?: string;
}

export async function importEmployeeDetails(file: File, month?: number, year?: number): Promise<EmployeeDetailsImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (month != null) formData.append("month", month.toString());
  if (year != null) formData.append("year", year.toString());
  return request<EmployeeDetailsImportResult>("/api/employees/import-details", {
    method: "POST",
    body: formData,
  });
}

export async function previewEmployeeDetails(file: File, month?: number, year?: number): Promise<EmployeeDetailsImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("preview", "true");
  if (month != null) formData.append("month", month.toString());
  if (year != null) formData.append("year", year.toString());
  return request<EmployeeDetailsImportResult>("/api/employees/import-details", {
    method: "POST",
    body: formData,
  });
}

export async function previewAttendanceImport(file: File, month: number, year: number): Promise<AttendanceImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("month", month.toString());
  formData.append("year", year.toString());
  formData.append("mode", "preview");
  return request<AttendanceImportResult>(`/api/attendance/import-excel`, {
    method: "POST",
    body: formData,
  });
}

export async function importAttendanceExcel(file: File, month: number, year: number, mode: AttendanceImportMode): Promise<AttendanceImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("month", month.toString());
  formData.append("year", year.toString());
  formData.append("mode", mode);
  return request<AttendanceImportResult>(`/api/attendance/import-excel`, {
    method: "POST",
    body: formData,
  });
}

export async function getDeletionRequestStatus(employeeId: string): Promise<DeletionRequest> {
  return request<DeletionRequest>(`/api/employees/${encodeURIComponent(employeeId)}/deletion-request`);
}

export async function sendDeletionRequest(employeeId: string): Promise<DeletionRequest> {
  return request<DeletionRequest>(`/api/employees/${encodeURIComponent(employeeId)}/deletion-request`, {
    method: "POST",
  });
}

export async function getPendingDeletionRequests(): Promise<DeletionRequest[]> {
  return request<DeletionRequest[]>("/api/employees/deletion-requests");
}

export async function approveDeletionRequest(employeeId: string): Promise<DeletionRequest> {
  return request<DeletionRequest>(`/api/employees/deletion-requests/${encodeURIComponent(employeeId)}/approve`, {
    method: "POST",
  });
}

export async function dismissDeletionRequest(employeeId: string): Promise<void> {
  return request<void>(`/api/employees/deletion-requests/${encodeURIComponent(employeeId)}/dismiss`, {
    method: "POST",
  });
}

/** Fired after approve/dismiss so the admin Monitor badge refetches without waiting for the poll interval. */
export const PENDING_DELETION_REQUESTS_CHANGED_EVENT = "attendly:pending-deletion-requests-changed";

export function emitPendingDeletionRequestsChanged() {
  window.dispatchEvent(new CustomEvent(PENDING_DELETION_REQUESTS_CHANGED_EVENT));
}

export async function getAttendance(employeeId: string, from?: string, to?: string): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  const query = params.toString();
  const url = query ? `/api/attendance/${encodeURIComponent(employeeId)}?${query}` : `/api/attendance/${encodeURIComponent(employeeId)}`;
  return request<AttendanceRecord[]>(url);
}

export async function getAttendanceForEmployees(
  employeeIds: string[],
  from?: string,
  to?: string
): Promise<Record<string, AttendanceRecord[]>> {
  const params = new URLSearchParams();
  params.set("employeeIds", employeeIds.join(","));
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return request<Record<string, AttendanceRecord[]>>(`/api/attendance?${params.toString()}`);
}

export async function markAttendance(employeeId: string, record: Omit<AttendanceRecord, "edited">): Promise<AttendanceRecord[]> {
  return request<AttendanceRecord[]>(`/api/attendance/${encodeURIComponent(employeeId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
}

export interface NotificationItem {
  id: string;
  employeeId: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  actionLabel?: string;
  actionRoute?: string;
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  return request<NotificationItem[]>("/api/notifications");
}

export async function fetchUnreadNotifications(): Promise<NotificationItem[]> {
  return request<NotificationItem[]>("/api/notifications/unread");
}

export async function markNotificationRead(id: string): Promise<void> {
  return request<void>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "PUT" });
}

export async function markAllNotificationsRead(): Promise<void> {
  return request<void>("/api/notifications/read-all", { method: "PUT" });
}

export interface MonthlyDetail {
  date: string;
  day: string;
  status: string;
}

export async function getMonthlyDetails(
  employeeId: string,
  month: number,
  year: number,
  type: string
): Promise<MonthlyDetail[]> {
  return request<MonthlyDetail[]>(
    `/api/attendance/monthly-details/${encodeURIComponent(employeeId)}?month=${month}&year=${year}&type=${type}`
  );
}
