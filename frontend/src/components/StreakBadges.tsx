import { Flame, Award, Users } from "lucide-react";

export default function StreakBadges({ streak, wfoCount, wfhCount }: { streak: number; wfoCount: number; wfhCount: number }) {
  const consistent = streak >= 3;
  const hybrid = wfhCount >= 2 && wfoCount >= 2;

  return (
    <div className="card-soft p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Streak</p>
          <p className="text-3xl font-bold mt-1.5 tabular-nums flex items-center gap-2">
            {streak}<span className="text-base font-medium text-muted-foreground">days</span>
          </p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-[hsl(var(--warning-soft))] grid place-items-center">
          <Flame className="h-6 w-6 text-[hsl(var(--warning))]" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {consistent && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]">
            <Award className="h-3 w-3" /> Consistent Performer
          </span>
        )}
        {hybrid && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 bg-primary-soft text-primary">
            <Users className="h-3 w-3" /> Hybrid Worker
          </span>
        )}
        {!consistent && !hybrid && (
          <span className="text-[11px] text-muted-foreground">Mark attendance daily to earn badges.</span>
        )}
      </div>
    </div>
  );
}
