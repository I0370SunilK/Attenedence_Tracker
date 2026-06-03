import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AttendanceRecord, AttendanceStatus, STATUS_BADGE } from "@/lib/types";
import { attendanceStreak, countByStatus, dateKey, greeting, isSameMonth, notMarkedThisMonth, notMarkedDatesThisMonth, weeklyCounts } from "@/lib/attendance";
import { markAttendance } from "@/lib/api";
import { emitAttendanceChanged } from "@/lib/attendanceEvents";
import { useEmployeeAttendance, queryKeys } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import StatCard from "@/components/StatCard";
import ClickableStatCard from "@/components/ClickableStatCard";
import AttendanceDetailsModal from "@/components/AttendanceDetailsModal";
import { Button } from "@/components/ui/button";
import { Building, Home, Briefcase, Plane, MinusCircle, CalendarPlus, Clock, Calendar, CalendarX2 } from "lucide-react";
import MarkAttendanceDialog from "@/components/MarkAttendanceDialog";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import WeeklySummary from "@/components/WeeklySummary";
import StreakBadges from "@/components/StreakBadges";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [notMarkedDialogOpen, setNotMarkedDialogOpen] = useState(false);
  const [notMarkedShowWeekends, setNotMarkedShowWeekends] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const { data: rawRecords = [] } = useEmployeeAttendance(user?.id);
  const records = rawRecords as AttendanceRecord[];

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const monthly = useMemo(() => countByStatus(records.filter(r => isSameMonth(r.date))), [records]);
  const notMarked = useMemo(() => notMarkedThisMonth(records), [records]);
  const notMarkedDatesList = useMemo(() => notMarkedDatesThisMonth(records), [records]);
  const week = useMemo(() => weeklyCounts(records), [records]);
  const streak = useMemo(() => attendanceStreak(records), [records]);

  const todayKey = dateKey(now);
  const todayRec = records.find(r => r.date === todayKey);

  const upsert = async (date: string, s: AttendanceStatus) => {
    if (!user) return;
    try {
      await markAttendance(user.id, {
        date,
        status: s,
        markedAt: new Date().toISOString(),
      });
      // Invalidate the attendance query so React Query refetches
      queryClient.invalidateQueries({ queryKey: queryKeys.employeeAttendance(user.id) });
      emitAttendanceChanged();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save attendance";
      toast.error(message);
      return false;
    }
  };

  const handleConfirm = async (s: AttendanceStatus) => {
    const ok = await upsert(todayKey, s);
    setOpen(false);
    if (ok) toast.success(`Marked as ${s} for today`);
  };

  const handleCalendarUpdate = async (date: string, s: AttendanceStatus) => {
    const ok = await upsert(date, s);
    if (ok) toast.success(`Updated ${format(new Date(date), "d MMM")} to ${s}`);
  };

  const handleCardClick = (type: string) => {
    if (type === "NOT_MARKED") {
      setNotMarkedDialogOpen(true);
    } else {
      setSelectedType(type);
      setDetailsOpen(true);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Hero */}
      <section className="card-soft p-4 sm:p-8 bg-gradient-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/2 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-primary-foreground/80 font-medium">{greeting(now)}</p>
            <h1 className="mt-1 max-w-[min(100%,46rem)] text-[clamp(1.75rem,2.2vw,2.45rem)] font-bold leading-tight text-white">
              Hi, <span className="inline-block">{user?.fullName} 👋</span>
            </h1>
            <p className="text-primary-foreground/85 text-sm mt-2">
              {format(now, "EEEE · d MMMM yyyy")}
            </p>
          </div>
          <div className="flex w-full items-center gap-4 shrink-0 self-start md:w-auto md:self-auto">
            <div className="w-full bg-white/10 backdrop-blur px-4 sm:px-5 py-3 rounded-xl border border-white/15 md:w-auto">
              <div className="flex items-center gap-2 text-xs text-primary-foreground/80 mb-0.5">
                <Clock className="h-3.5 w-3.5" /> Current time
              </div>
              <div className="text-xl sm:text-2xl font-bold tabular-nums whitespace-nowrap">{format(now, "hh:mm:ss a")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mark attendance */}
      <section className="card-soft p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Today's attendance</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {todayRec
              ? <>Marked as <span className={STATUS_BADGE[todayRec.status]}>{todayRec.status}</span> at {format(new Date(todayRec.markedAt), "hh:mm a")}</>
              : "You haven't marked attendance for today."}
          </p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)} className="w-full gap-2 sm:w-auto">
          <CalendarPlus className="h-4 w-4" />
          {todayRec ? "Update Attendance" : "Mark Attendance"}
        </Button>
      </section>

      {/* Monthly cards */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-bold">Monthly Overview</h2>
          <span className="text-xs text-muted-foreground font-medium">{format(now, "MMMM yyyy")}</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <ClickableStatCard
            label="WFO"
            value={monthly.WFO}
            icon={Building}
            accent="primary"
            onClick={() => handleCardClick("WFO")}
          />
          <ClickableStatCard
            label="WFH"
            value={monthly.WFH}
            icon={Home}
            accent="success"
            onClick={() => handleCardClick("WFH")}
          />
          <ClickableStatCard
            label="CLT"
            value={monthly.CLT}
            icon={Briefcase}
            accent="purple"
            onClick={() => handleCardClick("CLT")}
          />
          <ClickableStatCard
            label="PTO"
            value={monthly.PTO}
            icon={Plane}
            accent="warning"
            onClick={() => handleCardClick("PTO")}
          />
          <ClickableStatCard
            label="Not Marked"
            value={notMarked}
            icon={MinusCircle}
            accent="muted"
            onClick={() => handleCardClick("NOT_MARKED")}
          />
        </div>
      </section>

      {/* Calendar + side summary */}
      <section className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <AttendanceCalendar records={records} onUpdate={handleCalendarUpdate} />
        </div>
        <div className="space-y-6">
          <WeeklySummary records={records} />
          <StreakBadges streak={streak} wfoCount={week.WFO} wfhCount={week.WFH} />
        </div>
      </section>

      <MarkAttendanceDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleConfirm}
        currentStatus={todayRec?.status}
      />

      {user && (
        <AttendanceDetailsModal
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          month={now.getMonth() + 1}
          year={now.getFullYear()}
          type={selectedType}
          records={records}
        />
      )}

      {/* Not Marked Dialog - shows which working days have no attendance */}
      <Dialog open={notMarkedDialogOpen} onOpenChange={setNotMarkedDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg">Not Marked Days</DialogTitle>
            <DialogDescription>
              Working days in {format(now, "MMMM yyyy")} where attendance hasn't been marked
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {notMarkedDatesList.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">All working days marked! 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notMarkedDatesList.map((dateStr) => {
                  const date = new Date(dateStr + "T00:00:00");
                  return (
                    <div
                      key={dateStr}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarX2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium">
                            {format(date, "EEEE")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(date, "MMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-destructive bg-destructive/10 px-2.5 py-1 rounded-full">
                        Not marked
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {notMarkedDatesList.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-muted-foreground text-center">
                Total: <span className="font-semibold">{notMarkedDatesList.length}</span> unmarked working days
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}