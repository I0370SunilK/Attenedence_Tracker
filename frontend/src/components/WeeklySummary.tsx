import { AttendanceRecord } from "@/lib/types";
import { weeklyCounts } from "@/lib/attendance";
import { Building, Home, Briefcase, Plane } from "lucide-react";

export default function WeeklySummary({ records }: { records: AttendanceRecord[] }) {
  const c = weeklyCounts(records);
  const items = [
    { label: "WFO", value: c.WFO, icon: Building, color: "hsl(var(--primary))", soft: "var(--primary-soft)" },
    { label: "WFH", value: c.WFH, icon: Home, color: "hsl(var(--success))", soft: "var(--success-soft)" },
    { label: "CLT", value: c.CLT, icon: Briefcase, color: "hsl(var(--purple))", soft: "var(--purple-soft)" },
    { label: "PTO", value: c.PTO, icon: Plane, color: "hsl(var(--warning))", soft: "var(--warning-soft)" },
  ];
  return (
    <div className="card-soft p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm">This Week</h3>
        <span className="text-[11px] text-muted-foreground font-medium">Mon – Sun</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {items.map(it => {
          const Icon = it.icon;
          return (
            <div key={it.label} className="text-center">
              <div className="h-10 w-10 mx-auto rounded-xl grid place-items-center"
                style={{ background: `hsl(${it.soft})`, color: it.color }}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold mt-2 tabular-nums">{it.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">{it.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
