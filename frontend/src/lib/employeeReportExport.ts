import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AttendanceRecord, AttendanceStatus, Employee } from "./types";

export type EmployeeReportFormat = "pdf" | "csv";

export interface EmployeeReportSummary {
  WFO: number;
  WFH: number;
  CLT: number;
  PTO: number;
  HOL: number;
}

export interface EmployeeReportData {
  emp: Employee;
  from: Date;
  to: Date;
  summary: EmployeeReportSummary;
  rows: AttendanceRecord[];
}

export function buildEmployeeReportData(emp: Employee, rows: AttendanceRecord[], from: Date, to: Date): EmployeeReportData {
  const summary: EmployeeReportSummary = { WFO: 0, WFH: 0, CLT: 0, PTO: 0, HOL: 0 };
  rows.forEach((r) => {
    summary[r.status] += 1;
  });

  return { emp, from, to, summary, rows };
}

export function generateEmployeeReportCSV(data: EmployeeReportData): string {
  const escapeCSV = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const lines: string[] = [];

  lines.push(`Employee Attendance Report - ${data.emp.fullName}`);
  lines.push(`Employee ID: ${data.emp.employeeId}`);
  lines.push(`Designation: ${data.emp.designation}`);
  lines.push(`Range: ${format(data.from, "d MMM yyyy")} to ${format(data.to, "d MMM yyyy")}`);
  lines.push(`Generated: ${format(new Date(), "d MMM yyyy · hh:mm a")}`);
  lines.push("");
  lines.push("Summary");
  lines.push(["WFO", "WFH", "CLT", "PTO", "HOL", "Office Days (WFO+CLT)"].map(escapeCSV).join(","));
  lines.push(
    [data.summary.WFO, data.summary.WFH, data.summary.CLT, data.summary.PTO, data.summary.HOL, data.summary.WFO + data.summary.CLT]
      .map(escapeCSV)
      .join(",")
  );
  lines.push("");
  lines.push("Day-wise Details");
  lines.push(["Date", "Day", "Status", "Marked Time"].map(escapeCSV).join(","));

  data.rows.forEach((row) => {
    lines.push(
      [
        format(new Date(row.date), "dd MMM yyyy"),
        format(new Date(row.date), "EEEE"),
        row.status,
        format(new Date(row.markedAt), "hh:mm a"),
      ]
        .map(escapeCSV)
        .join(",")
    );
  });

  return lines.join("\n");
}

export function generateEmployeeReportPDF(data: EmployeeReportData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Employee Attendance Report", 40, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`${data.emp.fullName} (${data.emp.employeeId})`, 40, 62);
  doc.text(`${data.emp.designation} · ${data.emp.team}`, 40, 76);
  doc.text(`Range: ${format(data.from, "d MMM yyyy")} to ${format(data.to, "d MMM yyyy")}`, 40, 90);
  doc.text(`Generated: ${format(new Date(), "d MMM yyyy · hh:mm a")}`, 40, 104);
  doc.setTextColor(0);

  const cards = [
    { key: "WFO", value: data.summary.WFO, color: [67, 88, 220] as [number, number, number] },
    { key: "WFH", value: data.summary.WFH, color: [43, 163, 101] as [number, number, number] },
    { key: "CLT", value: data.summary.CLT, color: [146, 84, 222] as [number, number, number] },
    { key: "PTO", value: data.summary.PTO, color: [237, 143, 38] as [number, number, number] },
    { key: "HOL", value: data.summary.HOL, color: [43, 166, 232] as [number, number, number] },
  ];

  const cardTop = 124;
  const cardWidth = 98;
  cards.forEach((card, idx) => {
    const x = 40 + idx * (cardWidth + 8);
    doc.setDrawColor(225);
    doc.roundedRect(x, cardTop, cardWidth, 56, 8, 8);
    doc.setTextColor(...card.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(String(card.value), x + 12, cardTop + 34);
    doc.setTextColor(110);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(card.key, x + 12, cardTop + 18);
  });

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Office Days (WFO + CLT): ${data.summary.WFO + data.summary.CLT}`, 40, cardTop + 78);

  autoTable(doc, {
    startY: cardTop + 92,
    head: [["Date", "Day", "Status", "Marked Time"]],
    body: data.rows.map((row) => [
      format(new Date(row.date), "dd MMM yyyy"),
      format(new Date(row.date), "EEEE"),
      row.status,
      format(new Date(row.markedAt), "hh:mm a"),
    ]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [60, 80, 180], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 252] },
  });

  doc.save(
    `employee-report-${data.emp.employeeId}-${format(data.from, "yyyyMMdd")}-${format(data.to, "yyyyMMdd")}.pdf`
  );
}
