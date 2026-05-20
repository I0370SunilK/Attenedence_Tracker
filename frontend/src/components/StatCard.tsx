import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Accent = "primary" | "success" | "warning" | "purple" | "info" | "muted";

const ACCENT_BG: Record<Accent, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]",
  warning: "bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]",
  purple:  "bg-[hsl(var(--purple-soft))] text-[hsl(var(--purple))]",
  info:    "bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]",
  muted:   "bg-muted text-muted-foreground",
};

const ACCENT_BAR: Record<Accent, string> = {
  primary: "bg-[hsl(var(--primary))]",
  success: "bg-[hsl(var(--success))]",
  warning: "bg-[hsl(var(--warning))]",
  purple:  "bg-[hsl(var(--purple))]",
  info:    "bg-[hsl(var(--info))]",
  muted:   "bg-muted-foreground/40",
};

export default function StatCard({
  label, value, icon: Icon, accent = "primary", sub, trend,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: Accent;
  sub?: string;
  trend?: { value: number; label?: string };
}) {
  const trendUp = trend && trend.value >= 0;
  return (
    <div className="stat-card relative overflow-hidden group">
      <span className={cn("absolute inset-x-0 top-0 h-1", ACCENT_BAR[accent])} />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold mt-2 tabular-nums">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 mt-2 text-[11px] font-semibold rounded-full px-2 py-0.5",
              trendUp ? "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]"
                      : "bg-destructive/10 text-destructive"
            )}>
              {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trendUp ? "+" : ""}{trend.value}{trend.label ? ` ${trend.label}` : "%"}
            </div>
          )}
        </div>
        <div className={cn("h-10 w-10 rounded-xl grid place-items-center transition-transform group-hover:scale-105", ACCENT_BG[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
