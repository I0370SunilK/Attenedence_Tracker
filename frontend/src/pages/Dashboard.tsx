import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AttendanceRecord, AttendanceStatus, STATUS_BADGE } from "@/lib/types";
import { attendanceStreak, countByStatus, dateKey, greeting, isSameMonth, notMarkedThisMonth, weeklyCounts } from "@/lib/attendance";
import { getAttendance, markAttendance } from "@/lib/api";
import { emitAttendanceChanged } from "@/lib/attendanceEvents";
import StatCard from "@/components/StatCard";
import ClickableStatCard from "@/components/ClickableStatCard";
import AttendanceDetailsModal from "@/components/AttendanceDetailsModal";
import { Button } from "@/components/ui/button";
import { Building, Home, Briefcase, Plane, MinusCircle, CalendarPlus, Clock } from "lucide-react";
import MarkAttendanceDialog from "@/components/MarkAttendanceDialog";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import WeeklySummary from "@/components/WeeklySummary";
import StreakBadges from "@/components/StreakBadges";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    getAttendance(user.id)
      .then(setRecords)
      .catch(() => setRecords([]));
  }, [user]);

  const monthly = useMemo(() => countByStatus(records.filter(r => isSameMonth(r.date))), [records]);
  const notMarked = useMemo(() => notMarkedThisMonth(records), [records]);
  const week = useMemo(() => weeklyCounts(records), [records]);
  const streak = useMemo(() => attendanceStreak(records), [records]);

  const todayKey = dateKey(now);
  const todayRec = records.find(r => r.date === todayKey);

  const upsert = async (date: string, s: AttendanceStatus) => {
    if (!user) return;
    try {
      const saved = await markAttendance(user.id, {
        date,
        status: s,
        markedAt: new Date().toISOString(),
      });
      setRecords(saved);
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
    setSelectedType(type);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="card-soft p-6 sm:p-8 bg-gradient-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/2 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-sm text-primary-foreground/80 font-medium">{greeting(now)}</p>
            <h1 className="text-3xl sm:text-4xl font-bold mt-1">Hi, {user?.fullName.split(" ")[0]} 👋</h1>
            <p className="text-primary-foreground/85 text-sm mt-2">
              {format(now, "EEEE · d MMMM yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur px-5 py-3 rounded-xl border border-white/15">
              <div className="flex items-center gap-2 text-xs text-primary-foreground/80 mb-0.5">
                <Clock className="h-3.5 w-3.5" /> Current time
              </div>
              <div className="text-2xl font-bold tabular-nums">{format(now, "hh:mm:ss a")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mark attendance */}
      <section className="card-soft p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Today's attendance</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {todayRec
              ? <>Marked as <span className={STATUS_BADGE[todayRec.status]}>{todayRec.status}</span> at {format(new Date(todayRec.markedAt), "hh:mm a")}</>
              : "You haven't marked attendance for today."}
          </p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)} className="gap-2">
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
          <StatCard
            label="Not Marked"
            value={notMarked}
            icon={MinusCircle}
            accent="muted"
          />
        </div>
      </section>

      {/* Calendar + side summary */}
      <section className="grid lg:grid-cols-3 gap-6">
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
    </div>
  );
}
