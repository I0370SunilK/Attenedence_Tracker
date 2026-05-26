import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AttendanceRecord, AttendanceStatus, Employee, STATUS_COLOR } from "@/lib/types";
import { countByStatus } from "@/lib/attendance";
import {
  importEmployeeDetails,
  previewEmployeeDetails,
  previewAttendanceImport,
  importAttendanceExcel,
  type EmployeeDetailsImportResult,
  type AttendanceImportResult,
  type AttendanceImportPreviewRow,
} from "@/lib/api";
import { ATTENDANCE_CHANGED_EVENT } from "@/lib/attendanceEvents";
import { useEmployees, useAttendanceForEmployees } from "@/lib/queries";
import StatCard from "@/components/StatCard";
import { Users, CheckCircle2, AlertCircle, Trophy, FileText, BarChart3, CalendarX2, Loader2, Upload, UserPlus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { eachDayOfInterval, format } from "date-fns";
import DateRangePicker, { RangeContext } from "@/components/DateRangePicker";
import { defaultRange } from "@/lib/dateRange";
import StackedTrendChart from "@/components/StackedTrendChart";
import FullReportAnalyticsDialog from "@/components/FullReportAnalyticsDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type RankRow = {
  emp: Employee;
  counts: Record<AttendanceStatus, number>;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminDashboard() {
  const today = new Date();
  const navigate = useNavigate();
  const [range, setRange] = useState(defaultRange());
  const [selectedEmployeeDetailsFile, setSelectedEmployeeDetailsFile] = useState<File | null>(null);
  const [selectedEmployeeDetailsMonth, setSelectedEmployeeDetailsMonth] = useState<number>(today.getMonth() + 1);
  const [selectedEmployeeDetailsYear, setSelectedEmployeeDetailsYear] = useState<number>(today.getFullYear());
  const [employeeDetailsImporting, setEmployeeDetailsImporting] = useState(false);
  const [employeeDetailsPreviewing, setEmployeeDetailsPreviewing] = useState(false);
  const [employeeDetailsImportResult, setEmployeeDetailsImportResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [employeeDetailsPreview, setEmployeeDetailsPreview] = useState<EmployeeDetailsImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [attendancePreview, setAttendancePreview] = useState<AttendanceImportResult | null>(null);
  const [attendancePreviewing, setAttendancePreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [markedTodayDialogOpen, setMarkedTodayDialogOpen] = useState(false);
  const [notMarkedDialogOpen, setNotMarkedDialogOpen] = useState(false);
  const [yetToMarkDialogOpen, setYetToMarkDialogOpen] = useState(false);
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [employeeDetailsImportOpen, setEmployeeDetailsImportOpen] = useState(false);

  const employeesQuery = useEmployees();
  const employees = employeesQuery.data ?? [];
  const employeeIds = employees.map((employee) => employee.id).filter(Boolean);
  const todayKey = format(today, "yyyy-MM-dd");
  const rangeFromKey = format(range.from, "yyyy-MM-dd");
  const rangeToKey = format(range.to > today ? today : range.to, "yyyy-MM-dd");
  const rangeAttendanceQuery = useAttendanceForEmployees(employeeIds, rangeFromKey, rangeToKey);
  const todayAttendanceQuery = useAttendanceForEmployees(employeeIds, todayKey, todayKey);
  const rangeAttendance = rangeAttendanceQuery.data ?? {};
  const todayAttendance = todayAttendanceQuery.data ?? {};

  const stats = useMemo(() => {
    const total = employees.length;
    let marked = 0;
    employees.forEach(e => {
      if ((todayAttendance[e.id] || []).some(r => r.date === todayKey)) marked++;
    });
    return { total, marked, notMarked: total - marked };
  }, [employees, todayAttendance, todayKey]);

  // Get employees marked today with their status
  const markedTodayEmployees = useMemo(() => {
    return employees.filter(e => {
      const rec = (todayAttendance[e.id] || []).find(r => r.date === todayKey);
      return !!rec;
    }).map(e => {
      const rec = (todayAttendance[e.id] || []).find(r => r.date === todayKey);
      return { employee: e, status: rec?.status };
    }).sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName));
  }, [employees, todayAttendance, todayKey]);

  // Get employees not marked today
  const notMarkedTodayEmployees = useMemo(() => {
    return employees.filter(e => {
      const rec = (todayAttendance[e.id] || []).find(r => r.date === todayKey);
      return !rec;
    }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [employees, todayAttendance, todayKey]);

  const ranked: RankRow[] = useMemo(() => {
    return employees.map(e => {
      const recs = rangeAttendance[e.id] || [];
      return { emp: e, counts: countByStatus(recs) };
    }).sort((a, b) => {
      const officeA = a.counts.WFO + a.counts.CLT;
      const officeB = b.counts.WFO + b.counts.CLT;
      if (officeB !== officeA) return officeB - officeA;
      if (a.counts.WFH !== b.counts.WFH) return a.counts.WFH - b.counts.WFH;
      return a.emp.fullName.localeCompare(b.emp.fullName);
    });
  }, [employees, rangeAttendance]);

  const totalWorkingDaysInRange = useMemo(() => {
    const effectiveTo = range.to > today ? today : range.to;
    if (effectiveTo < range.from) return 0;
    return eachDayOfInterval({ start: range.from, end: effectiveTo }).filter((d) => {
      const dow = d.getDay();
      return dow !== 0 && dow !== 6;
    }).length;
  }, [range, today]);

  // Individual total working days per employee
  const empTotalDays = useMemo(() => {
    return new Map(
      ranked.map((row) => {
        const total = row.counts.WFO + row.counts.WFH + row.counts.CLT + row.counts.PTO;
        return [row.emp.id, total];
      })
    );
  }, [ranked]);

  const officeMetrics = useMemo(() => {
    const weeksInRange = totalWorkingDaysInRange > 0 ? totalWorkingDaysInRange / 5 : 0;
    return new Map(
      ranked.map((row) => {
        const officeDays = row.counts.WFO + row.counts.CLT;
        const empTotal = empTotalDays.get(row.emp.id) || 1;
        const officePct = empTotal > 0
          ? Math.round((officeDays / empTotal) * 100)
          : 0;
        const avgOfficePerWeek = weeksInRange > 0 ? officeDays / weeksInRange : 0;
        return [row.emp.id, { officeDays, officePct, meetsThreePerWeek: avgOfficePerWeek >= 3 }];
      })
    );
  }, [ranked, totalWorkingDaysInRange, empTotalDays]);

  const top5OfficeClient = useMemo(
    () => [...ranked].sort((a, b) =>
      (b.counts.WFO + b.counts.CLT) - (a.counts.WFO + a.counts.CLT)
    ).slice(0, 5),
    [ranked]
  );

  const avgOver3PerWeek = ranked.filter(r => (r.counts.WFO + r.counts.CLT) >= 12);
  const below4PerMonth = ranked.filter(r => (r.counts.WFO + r.counts.CLT) < 4);
  const fullyWFH = ranked.filter(r => r.counts.WFH > 0 && r.counts.WFO === 0 && r.counts.CLT === 0);

  // ── Yet to Mark Attendance (working days in range with no record) ──

  const yetToMarkAttendance = useMemo(() => {
    // Get all working days in the range (up to today)
    const effectiveTo = range.to > today ? today : range.to;
    if (effectiveTo < range.from) return [];

    const workingDays = eachDayOfInterval({ start: range.from, end: effectiveTo })
      .filter((d) => {
        const dow = d.getDay();
        return dow !== 0 && dow !== 6;
      })
      .map((d) => format(d, "yyyy-MM-dd"));

    // For each employee, find which working days they have no record for
    const result: Array<{ emp: Employee; missedDates: string[] }> = [];

    employees.forEach((emp) => {
      const empRecords = rangeAttendance[emp.id] || [];
      const recordDates = new Set(empRecords.map((r) => r.date));
      const missedDates = workingDays.filter((wd) => !recordDates.has(wd));
      if (missedDates.length > 0) {
        result.push({ emp, missedDates });
      }
    });

    // Sort: most missed days first, then alphabetically
    result.sort((a, b) => {
      if (b.missedDates.length !== a.missedDates.length) return b.missedDates.length - a.missedDates.length;
      return a.emp.fullName.localeCompare(b.emp.fullName);
    });

    return result;
  }, [employees, range, rangeAttendance, today]);

  const refreshDashboardData = async () => {
    await employeesQuery.refetch();
    await Promise.all([rangeAttendanceQuery.refetch(), todayAttendanceQuery.refetch()]);
  };

  useEffect(() => {
    const onChanged = () => {
      void refreshDashboardData();
    };
    window.addEventListener(ATTENDANCE_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(ATTENDANCE_CHANGED_EVENT, onChanged);
  }, [rangeAttendanceQuery, todayAttendanceQuery]);

   // Export modal
   const [reportOpen, setReportOpen] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        setAttendancePreview(null);
        setImportResult(null);
      }
    };

    const handleEmployeeDetailsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedEmployeeDetailsFile(file);
        setEmployeeDetailsPreview(null);
        setEmployeeDetailsImportResult(null);
      }
    };

   const handlePreviewEmployeeDetails = async () => {
     if (!selectedEmployeeDetailsFile) {
       setEmployeeDetailsImportResult({ message: "Select a file before previewing", type: "error" });
       return;
     }

     setEmployeeDetailsPreviewing(true);
     setEmployeeDetailsImportResult(null);
    try {
      const result = await previewEmployeeDetails(selectedEmployeeDetailsFile, selectedEmployeeDetailsMonth, selectedEmployeeDetailsYear);
      const total = result.totalRows ?? 0;
      const valid = result.validRows ?? 0;
      const errorCount = result.errors?.length || 0;

      setEmployeeDetailsPreview(result);
      setEmployeeDetailsImportResult({
        message: `Preview ready. Total rows ${total} | Ready to import ${valid}${errorCount ? ` | Errors ${errorCount}` : ""}`,
        type: errorCount ? "error" : "success",
      });
    } catch (error) {
      setEmployeeDetailsPreview(null);
      setEmployeeDetailsImportResult({
        message: getErrorMessage(error, "Failed to preview employee details"),
        type: "error",
      });
    } finally {
      setEmployeeDetailsPreviewing(false);
    }
   };

   const handlePreviewAttendanceImport = async () => {
     if (!selectedFile) {
       setImportResult({ message: 'Please select a file before previewing', type: 'error' });
       return;
     }

     setAttendancePreviewing(true);
     setImportResult(null);
     setAttendancePreview(null);

      try {
        const preview = await previewAttendanceImport(selectedFile, selectedMonth, selectedYear);
        setAttendancePreview(preview);
        const errors = preview.errors?.length || 0;
        if (errors > 0) {
          setImportResult({
            message: `Preview completed with ${errors} error(s). ${preview.errors.slice(0, 3).join(" | ")}`,
            type: 'error',
          });
        } else {
          setImportResult({
            message: `Preview ready: ${preview.totalAttendanceCells ?? 0} cells | New ${preview.newRecords ?? 0} | Update ${preview.updatedRecords ?? 0} | Same ${preview.sameRecords ?? 0}`,
            type: 'success',
          });
        }
     } catch (error) {
       setImportResult({ message: getErrorMessage(error, "Failed to preview attendance"), type: 'error' });
     } finally {
       setAttendancePreviewing(false);
     }
   };

   const handleImportExcel = async () => {
     setImporting(true);
     setImportResult(null);

     if (!selectedFile) {
       setImportResult({ message: 'Please select a file', type: 'error' });
       setImporting(false);
       return;
     }

     try {
       const result = await importAttendanceExcel(selectedFile, selectedMonth, selectedYear, "sync");
       setAttendancePreview(result);
       const summary = [`New ${result.newRecords ?? 0}`, `Updated ${result.updatedRecords ?? 0}`, `Same ${result.sameRecords ?? 0}`, `Errors ${result.errors?.length ?? 0}`]
         .filter(Boolean)
         .join(' | ');
       setImportResult({ message: result.success ? `Import completed. ${summary}` : `Import failed. ${summary}`, type: result.success ? 'success' : 'error' });
       if (result.success) {
         await refreshDashboardData();
       }
     } catch (error) {
       setImportResult({ message: getErrorMessage(error, "An unexpected error occurred"), type: 'error' });
     } finally {
       setImporting(false);
     }
   };

   const handleImportEmployeeDetails = async () => {
     if (!selectedEmployeeDetailsFile) {
       setEmployeeDetailsImportResult({ message: "Select a file before importing", type: "error" });
       return;
     }

     setEmployeeDetailsImporting(true);
     setEmployeeDetailsImportResult(null);

     try {
      const result = await importEmployeeDetails(selectedEmployeeDetailsFile, selectedEmployeeDetailsMonth, selectedEmployeeDetailsYear);
       const created = result.createdEmployees?.length || 0;
       const updated = result.updatedEmployees?.length || 0;
       const skipped = result.skippedEmployees?.length || 0;
       const errorCount = result.errors?.length || 0;
       const total = result.totalRows ?? 0;
       const valid = result.validRows ?? 0;

       const summary = [
         total ? `Total ${total}` : "",
         valid ? `Parsed ${valid}` : "",
         created ? `Created ${created}` : "",
         updated ? `Updated ${updated}` : "",
         skipped ? `Skipped ${skipped}` : "",
         errorCount ? `Errors ${errorCount}` : "",
       ].filter(Boolean).join(" | ");

       if (created || updated) {
         await refreshDashboardData();
       }

       setEmployeeDetailsImportResult({
         message: errorCount ? `${summary}. ${result.errors.slice(0, 3).join(" | ")}` : summary || "Import completed",
         type: errorCount ? "error" : "success",
       });

       if (!errorCount) {
         setSelectedEmployeeDetailsFile(null);
         setEmployeeDetailsPreview(null);
         setEmployeeDetailsImportOpen(false);
       }
     } catch (error) {
       setEmployeeDetailsImportResult({
         message: getErrorMessage(error, "Failed to import employee details"),
         type: "error",
       });
     } finally {
       setEmployeeDetailsImporting(false);
     }
   };

   const rangeLabel = useMemo(() => {
    if (range.preset === "today") return `Today · ${format(range.from, "d MMM yyyy")}`;
    if (range.preset === "week") return `This Week · ${format(range.from, "d MMM")} – ${format(range.to, "d MMM yyyy")}`;
    if (range.preset === "month") return `${format(range.from, "MMMM yyyy")}`;
    if (range.preset === "custom") return `${format(range.from, "d MMM yyyy")} – ${format(range.to, "d MMM yyyy")}`;
    return "";
  }, [range]);

  return (
    <div className="space-y-5 sm:space-y-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Employee Dashboard
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
         <div>
           <h1 className="text-2xl font-bold">Admin Overview</h1>
           <p className="text-sm text-muted-foreground mt-1">{format(today, "EEEE, d MMMM yyyy")}</p>
           <div className="mt-2"><RangeContext value={range} /></div>
         </div>
         <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
           <DateRangePicker value={range} onChange={setRange} />
           <Button onClick={() => setReportOpen(true)} className="w-full sm:w-auto">
             <FileText className="h-4 w-4 mr-2" /> Full Report
           </Button>
           <Button onClick={() => setEmployeeDetailsImportOpen(true)} variant="outline" className="w-full sm:w-auto">
             <UserPlus className="h-4 w-4 mr-2" /> Import Employee Details
           </Button>
           <Button onClick={() => setExcelImportOpen(true)} className="w-full sm:w-auto">
             <Upload className="h-4 w-4 mr-2" /> Import Excel
           </Button>
         </div>
       </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Total Employees" value={stats.total} icon={Users} accent="primary" />
        <div className="cursor-pointer" onClick={() => setMarkedTodayDialogOpen(true)}>
          <StatCard label="Marked Today" value={stats.marked} icon={CheckCircle2} accent="success"
            sub={`${stats.total > 0 ? Math.round(stats.marked / stats.total * 100) : 0}% completion`} />
        </div>
        <div className="cursor-pointer" onClick={() => setNotMarkedDialogOpen(true)}>
          <StatCard label="Not Marked" value={stats.notMarked} icon={AlertCircle} accent="warning" />
        </div>
      </div>

      <StackedTrendChart range={range} attendance={rangeAttendance} employeeIds={employees.map(e => e.id)} employees={employees} />

      {/* Leaderboard */}
      <Card className="card-soft overflow-hidden">
        <div className="px-4 py-4 sm:px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            <div>
              <h3 className="font-bold">Leaderboard</h3>
              <p className="text-xs text-muted-foreground">{rangeLabel}</p>
            </div>
          </div>
        </div>
        {ranked.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No data in this range</p>
        ) : (
          <>
          <div className="hidden overflow-auto max-h-[480px] md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3 font-semibold">Rank</th>
                  <th className="px-6 py-3 font-semibold">Employee</th>
                  <th className="px-6 py-3 font-semibold text-center">WFO</th>
                  <th className="px-6 py-3 font-semibold text-center">CLT</th>
                  <th className="px-6 py-3 font-semibold text-center">WFH</th>
                  <th className="px-6 py-3 font-semibold text-center">PTO</th>
                  <th className="px-6 py-3 font-semibold text-center">Total Working Days</th>
                  <th className="px-6 py-3 font-semibold text-center">% of (WFO + CLT)</th>
                  <th className="px-6 py-3 font-semibold text-center">3 (WFO + CLT) per Week</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr key={r.emp.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0 ? "bg-warning text-warning-foreground" :
                        i === 1 ? "bg-muted-foreground/20 text-foreground" :
                        i === 2 ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
                      }`}>{i + 1}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-white"
                          style={{ background: r.emp.avatarColor }}>
                          {r.emp.fullName.split(" ").map(n=>n[0]).slice(0,2).join("")}
                        </div>
                        <div>
                          <div className="font-medium">{r.emp.fullName}</div>
                          <div className="text-xs text-muted-foreground">{r.emp.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center font-semibold" style={{ color: STATUS_COLOR.WFO }}>{r.counts.WFO}</td>
                    <td className="px-6 py-3.5 text-center font-semibold" style={{ color: STATUS_COLOR.CLT }}>{r.counts.CLT}</td>
                    <td className="px-6 py-3.5 text-center font-semibold" style={{ color: STATUS_COLOR.WFH }}>{r.counts.WFH}</td>
                    <td className="px-6 py-3.5 text-center font-semibold" style={{ color: STATUS_COLOR.PTO }}>{r.counts.PTO}</td>
                    <td className="px-6 py-3.5 text-center font-semibold tabular-nums">{empTotalDays.get(r.emp.id) ?? 0}</td>
                    <td className="px-6 py-3.5 text-center font-semibold tabular-nums">
                      {officeMetrics.get(r.emp.id)?.officePct ?? 0}%
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`text-sm font-semibold ${
                          officeMetrics.get(r.emp.id)?.meetsThreePerWeek
                            ? "text-success"
                            : "text-muted-foreground"
                        }`}
                      >
                        {officeMetrics.get(r.emp.id)?.meetsThreePerWeek ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="max-h-[520px] space-y-3 overflow-y-auto p-3 md:hidden">
            {ranked.map((r, i) => (
              <div key={r.emp.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-warning text-warning-foreground" :
                    i === 1 ? "bg-muted-foreground/20 text-foreground" :
                    i === 2 ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
                  }`}>{i + 1}</span>
                  <div className="h-9 w-9 shrink-0 rounded-full grid place-items-center text-[11px] font-bold text-white"
                    style={{ background: r.emp.avatarColor }}>
                    {r.emp.fullName.split(" ").map(n=>n[0]).slice(0,2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{r.emp.fullName}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.emp.designation}</div>
                  </div>
                  <span className={`text-xs font-semibold ${officeMetrics.get(r.emp.id)?.meetsThreePerWeek ? "text-success" : "text-muted-foreground"}`}>
                    {officeMetrics.get(r.emp.id)?.meetsThreePerWeek ? "3/wk" : "Below"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2 border-t border-border pt-3 text-center">
                  {(["WFO","CLT","WFH","PTO"] as AttendanceStatus[]).map((status) => (
                    <div key={status}>
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground">{status}</div>
                      <div className="text-sm font-bold" style={{ color: STATUS_COLOR[status] }}>{r.counts[status]}</div>
                    </div>
                  ))}
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground">Office</div>
                    <div className="text-sm font-bold">{officeMetrics.get(r.emp.id)?.officePct ?? 0}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </Card>

      {/* Insights */}
      <Card className="card-soft overflow-hidden">
        <div className="px-4 py-4 sm:px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <div>
              <h3 className="font-bold">Insights & Analytics</h3>
              <p className="text-xs text-muted-foreground">{rangeLabel}</p>
            </div>
          </div>
        </div>
        <div className="p-3 sm:p-6">
          <div className="grid md:grid-cols-2 gap-3 sm:gap-6">
            <InsightCard title="Top 5 — WFO + CLT" subtitle="Most office presence in range"
              items={top5OfficeClient.map(r => ({ emp: r.emp, value: `${r.counts.WFO + r.counts.CLT} days` }))} />
            <InsightCard title="≥ 12 office days" subtitle="Consistent in-office collaborators"
              items={avgOver3PerWeek.map(r => ({ emp: r.emp, value: `${r.counts.WFO + r.counts.CLT} days` }))}
              empty="No employees meet this threshold" />
            <InsightCard title="< 4 office days" subtitle="May need a check-in"
              items={below4PerMonth.map(r => ({ emp: r.emp, value: `${r.counts.WFO + r.counts.CLT} days` }))}
              tone="warning"
              empty="Everyone is on track 🎉" />
            <InsightCard title="Fully Remote" subtitle="No office or client visits"
              items={fullyWFH.map(r => ({ emp: r.emp, value: `${r.counts.WFH} WFH` }))}
              empty="No fully remote employees" />
            <div className="cursor-pointer" onClick={() => setYetToMarkDialogOpen(true)}>
              <YetToMarkInsightCard
                yetToMarkData={yetToMarkAttendance}
                rangeLabel={rangeLabel}
              />
            </div>
          </div>
        </div>
      </Card>

      <FullReportAnalyticsDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        employees={employees}
        attendance={rangeAttendance}
        initialRange={range}
      />

      {/* Marked Today Dialog */}
      <Dialog open={markedTodayDialogOpen} onOpenChange={setMarkedTodayDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employees Marked Today</DialogTitle>
            <DialogDescription>
              {markedTodayEmployees.length} of {stats.total} employees marked attendance
            </DialogDescription>
          </DialogHeader>
          {markedTodayEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No employees marked today</p>
          ) : (
            <div className="space-y-2">
              {markedTodayEmployees.map(({ employee, status }) => (
                <div key={employee.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-white"
                      style={{ background: employee.avatarColor }}>
                      {employee.fullName.split(" ").map(n=>n[0]).slice(0,2).join("")}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{employee.fullName}</div>
                      <div className="text-[11px] text-muted-foreground">{employee.employeeId}</div>
                    </div>
                  </div>
                  {status && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{
                      background: STATUS_COLOR[status] + "20",
                      color: STATUS_COLOR[status]
                    }}>
                      {status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Not Marked Dialog */}
      <Dialog open={notMarkedDialogOpen} onOpenChange={setNotMarkedDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employees Not Marked Today</DialogTitle>
            <DialogDescription>
              {notMarkedTodayEmployees.length} of {stats.total} employees haven't marked attendance
            </DialogDescription>
          </DialogHeader>
          {notMarkedTodayEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">All employees marked today! 🎉</p>
          ) : (
            <div className="space-y-2">
              {notMarkedTodayEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50">
                  <div className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-white"
                    style={{ background: employee.avatarColor }}>
                    {employee.fullName.split(" ").map(n=>n[0]).slice(0,2).join("")}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{employee.fullName}</div>
                    <div className="text-[11px] text-muted-foreground">{employee.employeeId} • {employee.designation}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

       {/* Yet to Mark Attendance Dialog */}
       <Dialog open={yetToMarkDialogOpen} onOpenChange={setYetToMarkDialogOpen}>
         <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>Yet to Mark Attendance</DialogTitle>
             <DialogDescription>
               Employees who missed marking attendance on working days in {rangeLabel}
             </DialogDescription>
           </DialogHeader>
           {yetToMarkAttendance.length === 0 ? (
             <p className="text-sm text-muted-foreground py-8 text-center">All employees marked on all days 🎉</p>
           ) : (
             <div className="space-y-4">
               {yetToMarkAttendance.map(({ emp, missedDates }) => (
                 <div key={emp.id} className="rounded-lg border border-border p-4">
                   <div className="flex items-center justify-between mb-3">
                     <div className="flex items-center gap-3">
                       <div className="h-9 w-9 rounded-full grid place-items-center text-[11px] font-bold text-white"
                         style={{ background: emp.avatarColor }}>
                         {emp.fullName.split(" ").map(n=>n[0]).slice(0,2).join("")}
                       </div>
                       <div>
                         <div className="text-sm font-medium">{emp.fullName}</div>
                         <div className="text-[11px] text-muted-foreground">{emp.employeeId} • {emp.designation}</div>
                       </div>
                     </div>
                     <span className="text-sm font-bold text-destructive">{missedDates.length} missed</span>
                   </div>
                   <div className="flex flex-wrap gap-1.5">
                     {missedDates.map((date) => (
                       <span key={date} className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
                         <CalendarX2 className="h-3 w-3 mr-1" />
                         {format(new Date(date + "T00:00:00"), "dd MMM")}
                       </span>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
           )}
         </DialogContent>
       </Dialog>

       {/* Excel Import Dialog */}
       <Dialog open={excelImportOpen} onOpenChange={setExcelImportOpen}>
         <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>Import Attendance from Excel</DialogTitle>
             <DialogDescription>
               Upload an Excel file with the horizontal attendance matrix format. Columns: A=SL No, B=Employee ID, C=Employee Name, D=Project Team, E=Email. From column F onward the first header row must contain dates and the second header row may contain weekdays (MON, TUE...). Supported status values: WFO, WFH, CLT, CL, PTO, HOL. Only the selected month/year columns will be processed.
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div className="space-y-2">
               <span className="font-medium">Select Month and Year</span>
               <p className="text-xs text-muted-foreground">Choose the specific month to import so the system only uploads that month instead of processing all data at once.</p>
               <div className="flex gap-4">
                 <div>
                   <label className="text-[11px] text-muted-foreground block mb-1">Month</label>
                   <select
                     className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                     value={selectedMonth}
                     onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                   >
                     {[...Array(12)].map((_, i) => (
                       <option key={i + 1} value={i + 1}>
                         {new Date(0, i).toLocaleString('default', { month: 'long' })}
                       </option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="text-[11px] text-muted-foreground block mb-1">Year</label>
                   <select
                     className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                     value={selectedYear}
                     onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                   >
                     {[...Array(5)].map((_, i) => {
                       const year = new Date().getFullYear() - 2 + i;
                       return <option key={year} value={year}>{year}</option>;
                     })}
                   </select>
                 </div>
               </div>
             </div>
              <div className="space-y-2">
                <span className="font-medium">Upload Excel File</span>
                <div className="flex flex-col gap-2">
                  <label htmlFor="excel-file-input" className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
                    <Upload className="h-4 w-4 mr-2" />
                    <span>Click to upload or drag and drop</span>
                  </label>
                  <input
                    id="excel-file-input"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {selectedFile && (
                    <span className="text-sm text-muted-foreground">
                      Selected file: {selectedFile.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={handlePreviewAttendanceImport}
                  disabled={!selectedFile || attendancePreviewing || importing}
                  className="flex-1"
                >
                  {attendancePreviewing ? "Generating preview..." : "Preview Excel"}
                </Button>
                <Button
                  onClick={handleImportExcel}
                  disabled={!selectedFile || importing}
                  className="flex-1"
                >
                  {importing ? "Importing attendance..." : "Confirm import"}
                </Button>
              </div>
               {attendancePreview && (
                <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Month:</span> <span className="font-medium">{format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy")}</span></div>
                    <div><span className="text-muted-foreground">Employees:</span> <span className="font-medium">{attendancePreview.totalEmployeesProcessed ?? 0}</span></div>
                    <div><span className="text-muted-foreground">Cells:</span> <span className="font-medium">{attendancePreview.totalAttendanceCells ?? 0}</span></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-muted-foreground">New</span> <span className="font-medium">{attendancePreview.newRecords ?? 0}</span></div>
                    <div><span className="text-muted-foreground">Updated</span> <span className="font-medium">{attendancePreview.updatedRecords ?? 0}</span></div>
                    <div><span className="text-muted-foreground">Same</span> <span className="font-medium">{attendancePreview.sameRecords ?? 0}</span></div>
                    <div><span className="text-muted-foreground">Errors</span> <span className="font-medium">{attendancePreview.errors?.length ?? 0}</span></div>
                  </div>
                  {(attendancePreview.errors?.length || 0) > 0 && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                      {attendancePreview.errors?.slice(0, 5).join(" | ")}
                    </div>
                  )}
                  {(attendancePreview.previewRows?.length || 0) > 0 && (
                    <div className="overflow-auto rounded border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr className="text-left text-xs uppercase text-muted-foreground">
                            <th className="px-3 py-2">Row</th>
                            <th className="px-3 py-2">Employee ID</th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Existing</th>
                            <th className="px-3 py-2">Excel</th>
                            <th className="px-3 py-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendancePreview.previewRows?.map((row) => (
                            <tr key={`${row.rowNumber}-${row.employeeId}-${row.date}`} className="border-t border-border">
                              <td className="px-3 py-2">{row.rowNumber}</td>
                              <td className="px-3 py-2">{row.employeeId}</td>
                              <td className="px-3 py-2">{row.employeeName}</td>
                              <td className="px-3 py-2">{row.date}</td>
                              <td className="px-3 py-2">{row.existingValue}</td>
                              <td className="px-3 py-2">{row.excelValue}</td>
                              <td className="px-3 py-2">{row.action}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
             {importing && (
               <div className="flex items-center gap-2">
                 <Loader2 className="h-4 w-4 text-primary" />
                 <span>Importing data...</span>
               </div>
             )}
             {!importing && importResult && (
               <div className={`p-4 rounded-lg ${importResult.type === 'success' ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                 <span className={`font-medium ${importResult.type === 'success' ? 'text-success' : 'text-destructive'}`}>
                   {importResult.message}
                 </span>
               </div>
             )}
           </div>
       </DialogContent>
      </Dialog>

       <Dialog open={employeeDetailsImportOpen} onOpenChange={setEmployeeDetailsImportOpen}>
         <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>Import Employee Details</DialogTitle>
             <DialogDescription>
               Upload an Excel or CSV file exported from your employee sheet in this order:
               employeeId, FullName, Team, email.
               Legacy CSV order email, fullName, role, employeeId is also supported.
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
               Example:
               <br />
               <span className="font-mono">
                 employeeId,FullName,Team,email
               </span>
               <br />
               <span className="font-mono">
                 A3657,Naveen Kumar Paripalli,Center Head HYD,naveen.paripalli@srmtech.com
               </span>
             </div>
            <div className="space-y-2">
              <span className="font-medium">Select Month and Year</span>
              <p className="text-xs text-muted-foreground">Choose the month to only import employees with activity that month.</p>
              <div className="flex gap-4">
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Month</label>
                  <select
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedEmployeeDetailsMonth}
                    onChange={(e) => setSelectedEmployeeDetailsMonth(parseInt(e.target.value))}
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">Year</label>
                  <select
                    className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedEmployeeDetailsYear}
                    onChange={(e) => setSelectedEmployeeDetailsYear(parseInt(e.target.value))}
                  >
                    {[...Array(5)].map((_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
              </div>
            </div>
             <div className="space-y-2">
               <span className="font-medium">Upload Employee Details File</span>
               <div className="flex flex-col gap-2">
                 <label htmlFor="employee-details-csv-input" className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed bg-background px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
                   <UserPlus className="h-4 w-4 mr-2" />
                   <span>Click to choose Excel or CSV file</span>
                 </label>
                 <input
                   id="employee-details-csv-input"
                   type="file"
                   accept=".csv,text/csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                   className="hidden"
                   onChange={handleEmployeeDetailsFileChange}
                 />
                 {selectedEmployeeDetailsFile && (
                   <span className="text-sm text-muted-foreground">
                     Selected file: {selectedEmployeeDetailsFile.name}
                   </span>
                 )}
               </div>
             </div>
             {employeeDetailsPreview && (
               <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                   <div><span className="text-muted-foreground">File type:</span> <span className="font-medium uppercase">{employeeDetailsPreview.fileType ?? "-"}</span></div>
                   <div><span className="text-muted-foreground">Total rows:</span> <span className="font-medium">{employeeDetailsPreview.totalRows ?? 0}</span></div>
                   <div><span className="text-muted-foreground">Ready rows:</span> <span className="font-medium">{employeeDetailsPreview.validRows ?? 0}</span></div>
                   <div><span className="text-muted-foreground">Errors:</span> <span className="font-medium">{employeeDetailsPreview.errors?.length || 0}</span></div>
                 </div>
                 {(employeeDetailsPreview.previewRows?.length || 0) > 0 && (
                   <div className="overflow-auto rounded border border-border">
                     <table className="w-full text-sm">
                       <thead className="bg-muted/40">
                         <tr className="text-left">
                           <th className="px-3 py-2 font-medium">Row</th>
                           <th className="px-3 py-2 font-medium">Employee ID</th>
                           <th className="px-3 py-2 font-medium">Full Name</th>
                           <th className="px-3 py-2 font-medium">Team</th>
                           <th className="px-3 py-2 font-medium">Email</th>
                         </tr>
                       </thead>
                       <tbody>
                         {employeeDetailsPreview.previewRows?.map((row) => (
                           <tr key={`${row.rowNumber}-${row.employeeId}`} className="border-t border-border">
                             <td className="px-3 py-2">{row.rowNumber}</td>
                             <td className="px-3 py-2">{row.employeeId}</td>
                             <td className="px-3 py-2">{row.fullName}</td>
                             <td className="px-3 py-2">{row.team}</td>
                             <td className="px-3 py-2">{row.email}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
               </div>
             )}
             {employeeDetailsImportResult && (
               <div className={`p-4 rounded-lg ${employeeDetailsImportResult.type === 'success' ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                 <span className={`font-medium ${employeeDetailsImportResult.type === 'success' ? 'text-success' : 'text-destructive'}`}>
                   {employeeDetailsImportResult.message}
                 </span>
               </div>
             )}
             {(employeeDetailsPreview?.errors?.length || 0) > 0 && (
               <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                 {employeeDetailsPreview?.errors?.slice(0, 5).join(" | ")}
               </div>
             )}
             <div className="flex gap-3">
               <Button
                 variant="outline"
                 onClick={handlePreviewEmployeeDetails}
                 disabled={employeeDetailsPreviewing || employeeDetailsImporting || !selectedEmployeeDetailsFile}
                 className="flex-1"
               >
                 {employeeDetailsPreviewing ? "Previewing..." : "Preview File"}
               </Button>
               <Button
                 onClick={handleImportEmployeeDetails}
                 disabled={employeeDetailsImporting || employeeDetailsPreviewing || !selectedEmployeeDetailsFile}
                 className="flex-1"
               >
                 {employeeDetailsImporting ? "Importing employee details..." : "Import Employee Details"}
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>
    </div>
  );
}

function InsightCard({
  title, subtitle, items, empty = "No data", tone = "default",
}: {
  title: string; subtitle: string; tone?: "default" | "warning";
  items: { emp: Employee; value: string }[]; empty?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const INITIAL_DISPLAY = 5;
  const hasMore = items.length > INITIAL_DISPLAY;
  const visibleItems = expanded ? items : items.slice(0, INITIAL_DISPLAY);

  return (
    <Card className="card-soft p-4 sm:p-6 flex flex-col min-h-0">
      <div className="mb-4">
        <h3 className="font-bold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>
      ) : (
        <>
          <div className="overflow-y-auto max-h-[280px] overscroll-contain -mx-2 px-2">
            <ul className="space-y-2.5">
              {visibleItems.map(({ emp, value }) => (
                <li key={emp.id} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-8 w-8 shrink-0 rounded-full grid place-items-center text-[11px] font-bold text-white"
                      style={{ background: emp.avatarColor }}>
                      {emp.fullName.split(" ").map((n:string)=>n[0]).slice(0,2).join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{emp.fullName}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{emp.designation}</div>
                    </div>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${tone === "warning" ? "text-warning" : "text-primary"}`}>{value}</span>
                </li>
              ))}
            </ul>
          </div>
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors text-center w-full"
            >
              {expanded
                ? `Show less`
                : `+${items.length - INITIAL_DISPLAY} more (${items.length} total)`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

function YetToMarkInsightCard({
  yetToMarkData,
  rangeLabel,
}: {
  yetToMarkData: Array<{ emp: Employee; missedDates: string[] }>;
  rangeLabel: string;
}) {
  const totalMissedDays = yetToMarkData.reduce((sum, item) => sum + item.missedDates.length, 0);
  const top5 = yetToMarkData.slice(0, 5);

  return (
    <Card className="card-soft p-4 sm:p-6 hover:bg-muted/20 transition-colors h-full">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <CalendarX2 className="h-4 w-4 text-destructive" />
          <h3 className="font-bold">Yet to Mark Attendance</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{rangeLabel}</p>
      </div>
      <div className="mb-3">
        <span className="text-2xl font-bold text-destructive">{yetToMarkData.length}</span>
        <span className="text-sm text-muted-foreground ml-1">employees</span>
        <span className="text-xs text-muted-foreground block">
          {totalMissedDays} total missed day{totalMissedDays !== 1 ? "s" : ""}
        </span>
      </div>
      {top5.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">All employees marked on all days 🎉</p>
      ) : (
        <ul className="space-y-2.5">
          {top5.map(({ emp, missedDates }) => (
            <li key={emp.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full grid place-items-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: emp.avatarColor }}>
                  {emp.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{emp.fullName}</div>
                  <div className="text-[11px] text-muted-foreground">{emp.designation}</div>
                </div>
              </div>
              <span className="text-sm font-semibold text-destructive shrink-0 ml-2">{missedDates.length}d</span>
            </li>
          ))}
        </ul>
      )}
      {yetToMarkData.length > 5 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          +{yetToMarkData.length - 5} more employee{yetToMarkData.length - 5 !== 1 ? "s" : ""}
        </p>
      )}
    </Card>
  );
}
