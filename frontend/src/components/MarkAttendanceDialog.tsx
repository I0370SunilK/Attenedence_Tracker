import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AttendanceStatus, STATUS_LABEL } from "@/lib/types";
import { Building, Home, Plane, Briefcase, Sun, CheckCircle2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS: { v: AttendanceStatus; icon: LucideIcon; desc: string }[] = [
  { v: "WFO", icon: Building, desc: "At the office today" },
  { v: "WFH", icon: Home, desc: "Working from home" },
  { v: "CLT", icon: Briefcase, desc: "At a client location" },
  { v: "PTO", icon: Plane, desc: "Paid time off" },
  { v: "HOL", icon: Sun, desc: "Holiday" },
];

export default function MarkAttendanceDialog({
  open, onOpenChange, onConfirm, currentStatus,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (s: AttendanceStatus) => void;
  currentStatus?: AttendanceStatus;
}) {
  const [pick, setPick] = useState<AttendanceStatus | null>(currentStatus ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark today's attendance</DialogTitle>
          <DialogDescription>Choose how you're working today.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
          {OPTIONS.map(o => {
            const Icon = o.icon;
            const active = pick === o.v;
            return (
              <button key={o.v} onClick={() => setPick(o.v)}
                className={cn(
                  "relative rounded-xl border p-4 text-left transition-all",
                  active
                    ? "border-primary bg-primary-soft shadow-elevated"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                )}>
                <Icon className={cn("h-5 w-5 mb-2", active ? "text-primary" : "text-muted-foreground")} />
                <div className="text-sm font-bold">{o.v}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{o.desc}</div>
                {active && <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
        <div className="rounded-lg bg-muted/60 p-3 text-[11px] text-muted-foreground space-y-0.5">
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <div key={k}><span className="font-semibold text-foreground">{k}</span> · {v}</div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!pick} onClick={() => pick && onConfirm(pick)}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
