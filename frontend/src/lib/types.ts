export type AttendanceStatus = "WFO" | "WFH" | "CLT" | "PTO" | "HOL" | "WHO";

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  WFO: "Work From Office",
  WFH: "Work From Home",
  CLT: "Client Location",
  PTO: "Paid Time Off",
  HOL: "Holiday",
  WHO: "Work From Home Office",
};

export const STATUS_BADGE: Record<AttendanceStatus, string> = {
  WFO: "badge-status badge-wfo",
  WFH: "badge-status badge-wfh",
  CLT: "badge-status badge-clt",
  PTO: "badge-status badge-pto",
  HOL: "badge-status badge-hol",
  WHO: "badge-status badge-wfh",
};

export const STATUS_COLOR: Record<AttendanceStatus, string> = {
  WFO: "hsl(232 70% 56%)",
  WFH: "hsl(152 60% 42%)",
  CLT: "hsl(268 70% 60%)",
  PTO: "hsl(32 95% 54%)",
  HOL: "hsl(200 90% 50%)",
  WHO: "hsl(188 75% 38%)",
};

export const PRIORITY: Record<AttendanceStatus, number> = {
  WFO: 5, CLT: 4, WFH: 3, WHO: 3, PTO: 2, HOL: 1,
};

export type Designation =
  | "NA (please update)"
  | "Centre Head"
  | "Director"
  | "Associate Director"
  | "Senior Manager"
  | "Manager"
  | "Associate Manager"
  | "Project Manager"
  | "Associate Project Manager"
  | "Associate"
  | "Programmer Analyst"
  | "Programmer Analyst Trainee"
  | "Intern";

export const DESIGNATIONS: Designation[] = [
  "NA (please update)", "Centre Head", "Director", "Associate Director", "Senior Manager", "Manager", "Associate Manager", "Project Manager", "Associate Project Manager", "Associate", "Programmer Analyst", "Programmer Analyst Trainee", "Intern",
];

export const DESIGNATION_RANK: Record<Designation, number> = {
  "NA (please update)": 0,
  "Centre Head": 6,
  Director: 5,
  "Associate Director": 4,
  "Senior Manager": 3,
  Manager: 2,
  "Associate Manager": 1,
  "Project Manager": 1,
  "Associate Project Manager": 1,
  Associate: 1,
  "Programmer Analyst": 1,
  "Programmer Analyst Trainee": 1,
  Intern: 1,
};

export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  designation: Designation;
  team: string;
  email: string;
  city: string;
  state: string;
  country: string;
  avatarColor: string;
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  markedAt: string; // ISO time
  edited?: boolean;
}

export interface DeletionRequest {
  id: string;
  employeeId: string;
  status: "pending" | "approved" | "rejected" | string;
  requestedAt: string;
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
