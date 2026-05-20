import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Pencil, Clock } from "lucide-react";
import { AttendanceRecord, AttendanceStatus, STATUS_BADGE, STATUS_COLOR, STATUS_LABEL } from "@/lib/types";
import { dateKey, isEditable } from "@/lib/attendance";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DOW = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function AttendanceCalendar({
  records, onUpdate,
}: {
  records: AttendanceRecord[];
  onUpdate: (date: string, status: AttendanceStatus) => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const map = useMemo(() => new Map(records.map(r => [r.date, r])), [records]);

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    // Monday-first offset
    const offset = (first.getDay() + 6) % 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  return (
    <div className="card-soft p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold">Attendance Calendar</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Click any day to view or edit attendance.</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold w-32 text-center">{format(cursor, "MMMM yyyy")}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {DOW.map(d => <div key={d} className="text-center py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {grid.map((d, i) => {
          if (!d) return <div key={i} className="aspect-square" />;
          const k = dateKey(d);
          const rec = map.get(k);
          const isToday = dateKey(today) === k;
          const isFuture = d > today;
          return (
            <DayCell
              key={k}
              date={d}
              record={rec}
              isToday={isToday}
              isFuture={isFuture}
              onUpdate={onUpdate}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center gap-x-4 gap-y-2">
        {(Object.keys(STATUS_LABEL) as AttendanceStatus[]).map(s => (
          <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
            <span className="font-medium text-foreground">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayCell({
  date, record, isToday, isFuture, onUpdate,
}: {
  date: Date;
  record?: AttendanceRecord;
  isToday: boolean;
  isFuture: boolean;
  onUpdate: (date: string, status: AttendanceStatus) => void;
}) {
  const k = dateKey(date);
  const editable = !isFuture && isEditable(k);
  const [pick, setPick] = useState<AttendanceStatus | undefined>(record?.status);
  const [open, setOpen] = useState(false);

  const bg = record ? STATUS_COLOR[record.status] : undefined;
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const weekendBg = isWeekend && !record ? (dayOfWeek === 6 ? '#bfdbfe' : '#fecaca') : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={isFuture}
          className={cn(
            "aspect-square rounded-lg border text-left p-1.5 flex flex-col justify-between relative transition-all",
            "hover:shadow-md hover:-translate-y-0.5",
            record ? "border-transparent text-white" : "border-border bg-card",
            isFuture && "opacity-40 hover:translate-y-0 hover:shadow-none cursor-not-allowed",
            isToday && "ring-2 ring-primary ring-offset-1"
          )}
          style={record ? { background: bg } : weekendBg ? { background: weekendBg } : undefined}
        >
          <span className={cn("text-xs font-bold", record ? "text-white/95" : "text-foreground")}>
            {date.getDate()}
          </span>
          {record && (
            <span className="text-[10px] font-bold tracking-wider self-end opacity-95">
              {record.status}
            </span>
          )}
          {record?.edited && (
            <Pencil className="h-2.5 w-2.5 absolute top-1 right-1 opacity-80" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="center">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {format(date, "EEEE")}
            </p>
            <p className="text-sm font-bold">{format(date, "d MMMM yyyy")}</p>
          </div>

          {record ? (
            <>
              <div className="flex items-center justify-between">
                <span className={STATUS_BADGE[record.status]}>{record.status}</span>
                <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(record.markedAt), "hh:mm a")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{STATUS_LABEL[record.status]}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No attendance marked.</p>
          )}

          {editable ? (
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                {record ? "Update status" : "Mark status"}
              </label>
              <Select value={pick} onValueChange={(v) => setPick(v as AttendanceStatus)}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as AttendanceStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{s} — {STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="w-full" disabled={!pick || pick === record?.status}
                onClick={() => { if (pick) { onUpdate(k, pick); setOpen(false); } }}>
                Save
              </Button>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
