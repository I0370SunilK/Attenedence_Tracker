import { useEffect, useMemo, useState } from "react";
import { DeletionRequest, Employee, AttendanceRecord, AttendanceStatus, DESIGNATION_RANK, STATUS_BADGE, STATUS_COLOR } from "@/lib/types";
import { countByStatus } from "@/lib/attendance";
import {
  approveDeletionRequest,
  dismissDeletionRequest,
  emitPendingDeletionRequestsChanged,
} from "@/lib/api";
import { ATTENDANCE_CHANGED_EVENT } from "@/lib/attendanceEvents";
import { useEmployees, useAttendanceForEmployees, usePendingDeletionRequests } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, ArrowLeft, Download, FileText, Mail, MapPin, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { DateRange, filterRecords } from "@/lib/dateRange";
import {
  buildEmployeeReportData,
  EmployeeReportFormat,
  generateEmployeeReportCSV,
  generateEmployeeReportPDF,
} from "@/lib/employeeReportExport";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Monitor() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Employee | null>(null);
  const monthFrom = format(startOfMonth(today), "yyyy-MM-dd");
  const monthTo = format(today, "yyyy-MM-dd");

  const employeesQuery = useEmployees();
  const employees = employeesQuery.data ?? [];
  const attendanceQuery = useAttendanceForEmployees(
    employees.map((e) => e.id).filter(Boolean),
    monthFrom,
    monthTo
  );
  const monthAttendance = attendanceQuery.data ?? {};
  const pendingRequestsQuery = usePendingDeletionRequests();
  const requests = pendingRequestsQuery.data ?? [];
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [dismissingRequestId, setDismissingRequestId] = useState<string | null>(null);

  useEffect(() => {
    const onChanged = () => {
      void attendanceQuery.refetch();
      void pendingRequestsQuery.refetch();
    };
    window.addEventListener(ATTENDANCE_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(ATTENDANCE_CHANGED_EVENT, onChanged);
  }, [attendanceQuery, pendingRequestsQuery]);

  const list = useMemo(() => {
    return [...employees]
      .sort((a, b) => DESIGNATION_RANK[b.designation] - DESIGNATION_RANK[a.designation])
      .filter(e =>
        e.fullName.toLowerCase().includes(q.toLowerCase()) ||
        e.employeeId.toLowerCase().includes(q.toLowerCase()) ||
        e.team.toLowerCase().includes(q.toLowerCase())
      );
  }, [employees, q]);

  const refreshRequests = async () => {
    await pendingRequestsQuery.refetch();
  };

  const handleApproveRequest = async (request: DeletionRequest) => {
    setApprovingRequestId(request.id);
    try {
      await approveDeletionRequest(request.employeeId);
      toast.success(`Approved deletion request for ${request.employeeId}`);
      refreshRequests();
      emitPendingDeletionRequestsChanged();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to approve request";
      toast.error(message);
    } finally {
      setApprovingRequestId(null);
    }
  };

  const handleDismissRequest = async (request: DeletionRequest) => {
    setDismissingRequestId(request.id);
    try {
      await dismissDeletionRequest(request.employeeId);
      toast.info(`Dismissed deletion request for ${request.employeeId}`);
      refreshRequests();
      emitPendingDeletionRequestsChanged();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to dismiss request";
      toast.error(message);
    } finally {
      setDismissingRequestId(null);
    }
  };

  if (selected) return <EmployeeDetail emp={selected} monthAttendance={monthAttendance[selected.id] || []} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employee Monitor</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse and inspect individual attendance.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, ID, team…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      {requests.length > 0 && (
        <Card className="card-soft p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Pending deletion requests</h2>
                <p className="text-sm text-muted-foreground">Approve account deletion requests from employees.</p>
              </div>
            </div>
            <div className="space-y-3">
              {requests.map((request) => {
                const employee = employees.find((e) => e.employeeId === request.employeeId);
                return (
                  <div key={request.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border p-4 bg-card">
                    <div>
                      <p className="font-semibold">{employee?.fullName ?? request.employeeId}</p>
                      <p className="text-sm text-muted-foreground">{employee?.designation ?? "Employee"} · {request.employeeId}</p>
                      <p className="text-xs text-muted-foreground mt-1">Requested on {format(new Date(request.requestedAt), "d MMM yyyy, HH:mm")}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDismissRequest(request)}
                        disabled={dismissingRequestId === request.id || approvingRequestId === request.id}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproveRequest(request)}
                        disabled={approvingRequestId === request.id || dismissingRequestId === request.id}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {list.length === 0 ? (
        <Card className="card-soft p-16 text-center">
          <p className="text-sm text-muted-foreground">No employees match your search.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {list.map(e => {
            const c = countByStatus(monthAttendance[e.id] || []);
            return (
              <button key={e.id} onClick={() => setSelected(e)}
                className="card-soft p-4 sm:p-5 text-left hover:shadow-elevated hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl grid place-items-center text-sm font-bold text-white"
                    style={{ background: e.avatarColor }}>
                    {e.fullName.split(" ").map(n=>n[0]).slice(0,2).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{e.fullName}</div>
                    <div className="text-xs text-muted-foreground">{e.designation} · {e.team}</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border">
                  {(["WFO","WFH","CLT","PTO"] as AttendanceStatus[]).map(k => (
                    <div key={k} className="text-center">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">{k}</div>
                      <div className="text-sm font-bold mt-0.5" style={{ color: STATUS_COLOR[k] }}>{c[k]}</div>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmployeeDetail({ emp, monthAttendance, onBack }: { emp: Employee; monthAttendance: AttendanceRecord[]; onBack: () => void }) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const initialMonthStart = startOfMonth(today);
  const initialMonthEnd = endOfMonth(today) > today ? today : endOfMonth(today);
  const [range, setRange] = useState<DateRange>({ preset: "month", from: initialMonthStart, to: initialMonthEnd });
  const [timelineMode, setTimelineMode] = useState<"month" | "custom">("month");
  const [monthCursor, setMonthCursor] = useState(format(today, "yyyy-MM"));
  const [customFrom, setCustomFrom] = useState(format(initialMonthStart, "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(initialMonthEnd, "yyyy-MM-dd"));
  const [reportOpen, setReportOpen] = useState(false);
  const [reportFormat, setReportFormat] = useState<EmployeeReportFormat>("pdf");
  const [reportBusy, setReportBusy] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    getAttendance(emp.id)
      .then((data) => setRecords(data))
      .catch(() => setRecords([]));
  }, [emp.id]);

  const filtered = useMemo(() => {
    const safeTo = range.to > today ? today : range.to;
    const safeRange: DateRange = { ...range, to: safeTo };
    return filterRecords(records, safeRange);
  }, [range, records, today]);
  const visibleRecords = useMemo(() => filtered.slice().sort((a, b) => b.date.localeCompare(a.date)), [filtered]);

  const visibleCounts = useMemo(() => countByStatus(visibleRecords), [visibleRecords]);
  const officeDaysInRange = visibleCounts.WFO + visibleCounts.CLT;
  const monthCounts = countByStatus(monthAttendance);
  const officeDaysThisMonth = monthCounts.WFO + monthCounts.CLT;

  const workingDaysInRange = useMemo(() => {
    if (range.from > range.to) return 0;
    const safeTo = range.to > today ? today : range.to;
    if (range.from > safeTo) return 0;
    return eachDayOfInterval({ start: range.from, end: safeTo }).filter((d) => {
      const dow = d.getDay();
      return dow !== 0 && dow !== 6;
    }).length;
  }, [range, today]);

  const weeksInRange = workingDaysInRange > 0 ? workingDaysInRange / 5 : 0;
  const avgOfficeDaysPerWeek = weeksInRange > 0 ? officeDaysInRange / weeksInRange : 0;
  const meetsThreeDaysPerWeek = avgOfficeDaysPerWeek >= 3;

  const pie = (Object.keys(visibleCounts) as AttendanceStatus[])
    .filter((k) => visibleCounts[k] > 0)
    .map((k) => ({ name: k, value: visibleCounts[k] }));

  const months = useMemo(() => {
    const arr = [];
    const anchor = new Date(range.to > today ? today : range.to);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      const monthStart = startOfMonth(d);
      const monthEnd = endOfMonth(d) > today ? today : endOfMonth(d);
      const recs = records.filter((r) => {
        const dt = new Date(r.date);
        return dt >= monthStart && dt <= monthEnd;
      });
      const c = countByStatus(recs);
      arr.push({ name: format(d, "MMM"), WFO: c.WFO, WFH: c.WFH, CLT: c.CLT, PTO: c.PTO });
    }
    return arr;
  }, [records, range.to, today]);

  const handleDownloadReport = async () => {
    if (reportBusy) return;
    setReportBusy(true);
    try {
      const safeTo = range.to > today ? today : range.to;
      const data = buildEmployeeReportData(emp, visibleRecords, range.from, safeTo);

      if (reportFormat === "pdf") {
        generateEmployeeReportPDF(data);
      } else {
        const csv = generateEmployeeReportCSV(data);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `employee-report-${emp.employeeId}-${format(range.from, "yyyyMMdd")}-${format(safeTo, "yyyyMMdd")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success(`${reportFormat.toUpperCase()} report downloaded`, {
        description: `${emp.fullName} · ${format(range.from, "d MMM yyyy")} to ${format(safeTo, "d MMM yyyy")}`,
      });
      setReportOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate employee report");
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to directory
      </Button>

      <Card className="card-soft overflow-hidden">
        <div className="h-24 bg-gradient-primary" />
        <div className="px-4 sm:px-8 pb-5 sm:pb-6 -mt-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex items-end gap-3 sm:gap-4 min-w-0">
              <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl border-4 border-card grid place-items-center text-lg sm:text-xl font-bold text-white shadow-elevated"
                style={{ background: emp.avatarColor }}>
                {emp.fullName.split(" ").map(n => n[0]).slice(0,2).join("")}
              </div>
              <div className="min-w-0 pb-1">
                <h2 className="truncate text-lg sm:text-xl font-bold">{emp.fullName}</h2>
                <p className="truncate text-sm text-muted-foreground">{emp.employeeId} · {emp.designation} · {emp.team}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setReportOpen(true)}>
                <FileText className="h-4 w-4 mr-2" /> Report
              </Button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-5 sm:mt-6 text-sm">
            <div className="flex min-w-0 items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4 shrink-0" /> <span className="truncate">{emp.email}</span></div>
            <div className="flex min-w-0 items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" /> <span className="truncate">{emp.city}, {emp.state}</span></div>
          </div>
        </div>
      </Card>

      <Card className="card-soft p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Timeline</h3>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg border border-border p-1 mb-3">
          <button
            className={`px-3 py-1.5 text-xs rounded-md font-medium ${timelineMode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            onClick={() => {
              setTimelineMode("month");
              const [yy, mm] = monthCursor.split("-").map(Number);
              const from = new Date(yy, (mm || 1) - 1, 1);
              const to = endOfMonth(from) > today ? today : endOfMonth(from);
              setRange({ preset: "month", from, to });
            }}
          >
            Month
          </button>
          <button
            className={`px-3 py-1.5 text-xs rounded-md font-medium ${timelineMode === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            onClick={() => setTimelineMode("custom")}
          >
            Custom
          </button>
        </div>

        {timelineMode === "month" ? (
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Month</Label>
              <Input
                type="month"
                value={monthCursor}
                max={format(today, "yyyy-MM")}
                onChange={(e) => {
                  setMonthCursor(e.target.value);
                  const [yy, mm] = e.target.value.split("-").map(Number);
                  if (!yy || !mm) return;
                  const from = new Date(yy, mm - 1, 1);
                  const to = endOfMonth(from) > today ? today : endOfMonth(from);
                  setRange({ preset: "month", from, to });
                }}
                className="h-9 w-full sm:w-52"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">From</Label>
              <Input type="date" value={customFrom} max={format(today, "yyyy-MM-dd")} onChange={(e) => setCustomFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">To</Label>
              <Input type="date" value={customTo} max={format(today, "yyyy-MM-dd")} onChange={(e) => setCustomTo(e.target.value)} className="h-9" />
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (!customFrom || !customTo) return;
                const rawFrom = new Date(`${customFrom}T00:00:00`);
                const rawTo = new Date(`${customTo}T00:00:00`);
                const sortedFrom = rawFrom <= rawTo ? rawFrom : rawTo;
                const sortedTo = rawFrom <= rawTo ? rawTo : rawFrom;
                const safeTo = sortedTo > today ? today : sortedTo;
                const safeFrom = sortedFrom > safeTo ? safeTo : sortedFrom;
                setRange({ preset: "custom", from: safeFrom, to: safeTo });
              }}
            >
              Apply
            </Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="card-soft p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">3 Days/Week (WFO+CLT)</p>
          <p className={`text-2xl font-bold mt-1 ${meetsThreeDaysPerWeek ? "text-success" : "text-warning"}`}>
            {meetsThreeDaysPerWeek ? "Yes" : "No"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{avgOfficeDaysPerWeek.toFixed(1)} office days/week in selected timeline</p>
        </Card>
        <Card className="card-soft p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Office Days in Month</p>
          <p className="text-2xl font-bold mt-1 text-primary">{officeDaysThisMonth}</p>
          <p className="text-xs text-muted-foreground mt-1">Current month total (WFO + CLT)</p>
        </Card>
        <Card className="card-soft p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Office Days in Timeline</p>
          <p className="text-2xl font-bold mt-1 text-primary">{officeDaysInRange}</p>
          <p className="text-xs text-muted-foreground mt-1">{format(range.from, "d MMM yyyy")} - {format(range.to > today ? today : range.to, "d MMM yyyy")}</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {(["WFO","WFH","CLT","PTO"] as AttendanceStatus[]).map(k => (
          <div key={k} className="card-soft p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{k}</p>
            <p className="text-2xl font-bold mt-1.5" style={{ color: STATUS_COLOR[k] }}>{visibleCounts[k]}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="card-soft p-4 sm:p-6 lg:col-span-2">
          <h3 className="font-bold mb-1">Last 6 Months</h3>
          <p className="text-xs text-muted-foreground mb-4">Stacked status counts</p>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={months} margin={{ top: 8, right: 8, left: -16 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="WFO" stackId="a" fill={STATUS_COLOR.WFO} />
                <Bar dataKey="WFH" stackId="a" fill={STATUS_COLOR.WFH} />
                <Bar dataKey="CLT" stackId="a" fill={STATUS_COLOR.CLT} />
                <Bar dataKey="PTO" stackId="a" fill={STATUS_COLOR.PTO} radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="card-soft p-4 sm:p-6">
          <h3 className="font-bold mb-1">Selected Timeline</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribution</p>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                  {pie.map(p => <Cell key={p.name} fill={STATUS_COLOR[p.name as AttendanceStatus]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="card-soft overflow-hidden">
        <div className="px-4 py-4 sm:px-6 border-b border-border">
          <h3 className="font-bold">Attendance Statement</h3>
          <p className="text-xs text-muted-foreground">{visibleRecords.length} records</p>
        </div>
        <div className="hidden max-h-[420px] overflow-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 sticky top-0">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Day</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map(r => (
                <tr key={r.date} className="border-t border-border hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium">{format(new Date(r.date), "dd MMM yyyy")}</td>
                  <td className="px-6 py-3 text-muted-foreground">{format(new Date(r.date), "EEEE")}</td>
                  <td className="px-6 py-3"><span className={STATUS_BADGE[r.status]}>{r.status}</span></td>
                  <td className="px-6 py-3 text-right text-muted-foreground tabular-nums">{format(new Date(r.markedAt), "hh:mm a")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="max-h-[420px] space-y-2 overflow-y-auto p-3 md:hidden">
          {visibleRecords.map(r => (
            <div key={r.date} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{format(new Date(r.date), "dd MMM yyyy")}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(r.date), "EEEE")}</div>
                </div>
                <span className={STATUS_BADGE[r.status]}>{r.status}</span>
              </div>
              <div className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
                Marked at <span className="font-semibold text-foreground tabular-nums">{format(new Date(r.markedAt), "hh:mm a")}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={reportOpen} onOpenChange={(o) => !reportBusy && setReportOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download Employee Report</DialogTitle>
            <DialogDescription>
              Export selected timeline data for {emp.fullName} as PDF or CSV.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Timeline: {format(range.from, "d MMM yyyy")} - {format(range.to > today ? today : range.to, "d MMM yyyy")}
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Format</Label>
              <RadioGroup
                value={reportFormat}
                onValueChange={(v) => setReportFormat(v as EmployeeReportFormat)}
                className="grid grid-cols-2 gap-3 mt-2"
              >
                <label className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer ${reportFormat === "pdf" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem id="emp-pdf" value="pdf" />
                  <span className="text-sm font-medium">PDF</span>
                </label>
                <label className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer ${reportFormat === "csv" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem id="emp-csv" value="csv" />
                  <span className="text-sm font-medium">CSV</span>
                </label>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)} disabled={reportBusy}>Cancel</Button>
            <Button onClick={handleDownloadReport} disabled={reportBusy || visibleRecords.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Download {reportFormat.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
