import { eachDayOfInterval, format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { countByStatus } from "./attendance";
import { DateRange, filterRecords } from "./dateRange";
import { AttendanceRecord, AttendanceStatus, Employee } from "./types";

export interface AnalyticsExportData {
  leaderboard: LeaderboardRow[];
  top5: Top5Row[];
  consistentInOffice: ConsistentRow[];
  lessThan4Days: LessThan4Row[];
  fullyRemote: FullyRemoteRow[];
}

export interface LeaderboardRow {
  rank: number;
  employeeId: string;
  name: string;
  designation: string;
  team: string;
  wfo: number;
  clt: number;
  wfh: number;
  pto: number;
  hol: number;
  totalWorkingDays: number;
  officePct: number;
  meetsThreePerWeek: boolean;
}

export interface Top5Row {
  rank: number;
  employeeId: string;
  name: string;
  designation: string;
  team: string;
  totalOffice: number;
}

export interface ConsistentRow {
  employeeId: string;
  name: string;
  designation: string;
  team: string;
  totalOffice: number;
}

export interface LessThan4Row {
  employeeId: string;
  name: string;
  designation: string;
  team: string;
  totalOffice: number;
}

export interface FullyRemoteRow {
  employeeId: string;
  name: string;
  designation: string;
  team: string;
  wfh: number;
}

interface AnalyticsSection {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

/**
 * Build analytics report data reusing dashboard aggregation logic.
 */
export function buildAnalyticsReport(
  employees: Employee[],
  attendance: Record<string, AttendanceRecord[]>,
  range: DateRange
): AnalyticsExportData {
  type RankRow = {
    emp: Employee;
    counts: Record<AttendanceStatus, number>;
  };

  const today = new Date();

  const ranked: RankRow[] = employees
    .map((employee) => {
      const recs = filterRecords(attendance[employee.id] || [], range);
      return { emp: employee, counts: countByStatus(recs) };
    })
    .sort((a, b) => {
      if (b.counts.WFO !== a.counts.WFO) return b.counts.WFO - a.counts.WFO;
      if (b.counts.CLT !== a.counts.CLT) return b.counts.CLT - a.counts.CLT;
      if (b.counts.WFH !== a.counts.WFH) return b.counts.WFH - a.counts.WFH;
      return a.counts.PTO - b.counts.PTO;
    });

  // Calculate total working days in range
  const effectiveTo = range.to > today ? today : range.to;
  const totalWorkingDaysInRange = effectiveTo >= range.from
    ? eachDayOfInterval({ start: range.from, end: effectiveTo }).filter((d) => {
        const dow = d.getDay();
        return dow !== 0 && dow !== 6;
      }).length
    : 0;

  const weeksInRange = totalWorkingDaysInRange > 0 ? totalWorkingDaysInRange / 5 : 0;

  const leaderboard: LeaderboardRow[] = ranked.map((row, index) => {
    const empTotalDays = row.counts.WFO + row.counts.WFH + row.counts.CLT + row.counts.PTO;
    const officeDays = row.counts.WFO + row.counts.CLT;
    const officePct = empTotalDays > 0 ? Math.round((officeDays / empTotalDays) * 100) : 0;
    const avgOfficePerWeek = weeksInRange > 0 ? officeDays / weeksInRange : 0;
    const meetsThreePerWeek = avgOfficePerWeek >= 3;

    return {
      rank: index + 1,
      employeeId: row.emp.employeeId,
      name: row.emp.fullName,
      designation: row.emp.designation,
      team: row.emp.team,
      wfo: row.counts.WFO,
      clt: row.counts.CLT,
      wfh: row.counts.WFH,
      pto: row.counts.PTO,
      hol: row.counts.HOL,
      totalWorkingDays: empTotalDays,
      officePct,
      meetsThreePerWeek,
    };
  });

  const top5: Top5Row[] = [...ranked]
    .sort((a, b) => b.counts.WFO + b.counts.CLT - (a.counts.WFO + a.counts.CLT))
    .slice(0, 5)
    .map((row, index) => ({
      rank: index + 1,
      employeeId: row.emp.employeeId,
      name: row.emp.fullName,
      designation: row.emp.designation,
      team: row.emp.team,
      totalOffice: row.counts.WFO + row.counts.CLT,
    }));

  const consistentInOffice: ConsistentRow[] = ranked
    .filter((row) => row.counts.WFO + row.counts.CLT >= 12)
    .map((row) => ({
      employeeId: row.emp.employeeId,
      name: row.emp.fullName,
      designation: row.emp.designation,
      team: row.emp.team,
      totalOffice: row.counts.WFO + row.counts.CLT,
    }));

  const lessThan4Days: LessThan4Row[] = ranked
    .filter((row) => row.counts.WFO + row.counts.CLT < 4)
    .map((row) => ({
      employeeId: row.emp.employeeId,
      name: row.emp.fullName,
      designation: row.emp.designation,
      team: row.emp.team,
      totalOffice: row.counts.WFO + row.counts.CLT,
    }));

  const fullyRemote: FullyRemoteRow[] = ranked
    .filter((row) => row.counts.WFH > 0 && row.counts.WFO === 0 && row.counts.CLT === 0)
    .map((row) => ({
      employeeId: row.emp.employeeId,
      name: row.emp.fullName,
      designation: row.emp.designation,
      team: row.emp.team,
      wfh: row.counts.WFH,
    }));

  return {
    leaderboard,
    top5,
    consistentInOffice,
    lessThan4Days,
    fullyRemote,
  };
}

function buildAnalyticsSections(data: AnalyticsExportData): AnalyticsSection[] {
  return [
    {
      title: "1. LEADERBOARD - ALL EMPLOYEES",
      headers: ["Rank", "Emp ID", "Name", "Designation", "Team", "WFO", "CLT", "WFH", "PTO", "HOL", "Total Working Days", "% of (WFO + CLT)", "3 (WFO + CLT) per Week"],
      rows: data.leaderboard.map((row) => [
        row.rank,
        row.employeeId,
        row.name,
        row.designation,
        row.team,
        row.wfo,
        row.clt,
        row.wfh,
        row.pto,
        row.hol,
        row.totalWorkingDays,
        `${row.officePct}%`,
        row.meetsThreePerWeek ? "Yes" : "No",
      ]),
    },
    {
      title: "2. TOP 5 EMPLOYEES BY OFFICE PRESENCE (WFO + CLT)",
      headers: ["Rank", "Emp ID", "Name", "Designation", "Team", "Total Office Days"],
      rows: data.top5.map((row) => [
        row.rank,
        row.employeeId,
        row.name,
        row.designation,
        row.team,
        row.totalOffice,
      ]),
    },
    {
      title: "3. CONSISTENT IN-OFFICE EMPLOYEES (>= 12 DAYS)",
      headers: ["Emp ID", "Name", "Designation", "Team", "Total Office Days"],
      rows: data.consistentInOffice.map((row) => [
        row.employeeId,
        row.name,
        row.designation,
        row.team,
        row.totalOffice,
      ]),
    },
    {
      title: "4. EMPLOYEES WITH LESS THAN 4 OFFICE DAYS",
      headers: ["Emp ID", "Name", "Designation", "Team", "Total Office Days"],
      rows: data.lessThan4Days.map((row) => [
        row.employeeId,
        row.name,
        row.designation,
        row.team,
        row.totalOffice,
      ]),
    },
    {
      title: "5. FULLY REMOTE EMPLOYEES (WFO = 0, CLT = 0, WFH > 0)",
      headers: ["Emp ID", "Name", "Designation", "Team", "WFH Days"],
      rows: data.fullyRemote.map((row) => [
        row.employeeId,
        row.name,
        row.designation,
        row.team,
        row.wfh,
      ]),
    },
  ];
}

/**
 * Generate analytics CSV from the same section data used by the PDF export.
 */
export function generateAnalyticsCSV(
  data: AnalyticsExportData,
  periodLabel: string
): string {
  const lines: string[] = [];
  const sections = buildAnalyticsSections(data);

  const escapeCSV = (value: string | number | boolean) => {
    const safeValue = String(value ?? "");
    return `"${safeValue.replace(/"/g, '""')}"`;
  };

  lines.push(`Employee Attendance Report (${periodLabel})`);
  lines.push(`Generated: ${format(new Date(), "d MMM yyyy, hh:mm a")}`);
  lines.push("");

  sections.forEach((section) => {
    lines.push(`=== ${section.title} ===`);
    lines.push(section.headers.map(escapeCSV).join(","));
    section.rows.forEach((row) => {
      lines.push(row.map(escapeCSV).join(","));
    });
    if (section.rows.length === 0) {
      lines.push('"No records for this section in the selected range."');
    }
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Generate analytics PDF using the same sections and values as the CSV export.
 */
export function generateAnalyticsPDF(
  data: AnalyticsExportData,
  periodLabel: string
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const sections = buildAnalyticsSections(data);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 40;

  const addFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page);
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`Page ${page}`, 40, pageHeight - 20);
    }
  };

  const ensureSpace = (requiredHeight: number) => {
    if (yPosition + requiredHeight <= pageHeight - 36) return;
    doc.addPage();
    yPosition = 40;
  };

  const addSection = (section: AnalyticsSection) => {
    ensureSpace(section.rows.length === 0 ? 72 : 110);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(section.title, 40, yPosition);
    yPosition += 18;

    if (section.rows.length === 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120);
      doc.text("No records for this section in the selected range.", 40, yPosition + 10);
      yPosition += 34;
      return;
    }

    autoTable(doc, {
      startY: yPosition,
      head: [section.headers],
      body: section.rows.map((row) => row.map((cell) => String(cell ?? ""))),
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: "linebreak",
        textColor: 40,
      },
      headStyles: {
        fillColor: [60, 80, 180],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 247, 252] },
      margin: { left: 40, right: 40, top: 40, bottom: 36 },
      tableWidth: pageWidth - 80,
    });

    yPosition = ((doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? yPosition) + 18;
  };

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(`Employee Attendance Report (${periodLabel})`, 40, yPosition);
  yPosition += 18;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Generated: ${format(new Date(), "d MMM yyyy, hh:mm a")}`, 40, yPosition);
  yPosition += 24;

  sections.forEach(addSection);
  addFooter();

  doc.save(`analytics-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}