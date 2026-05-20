import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AttendanceRecord, AttendanceStatus, STATUS_BADGE, STATUS_COLOR } from "@/lib/types";
import { getAttendance } from "@/lib/api";
import { countByStatus } from "@/lib/attendance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import DateRangePicker, { RangeContext } from "@/components/DateRangePicker";
import { defaultRange, filterRecords, rangeDays } from "@/lib/dateRange";
import ExportDialog from "@/components/ExportDialog";
import { Download } from "lucide-react";

export default function Timesheets() {
  const { user } = useAuth();
  const [all, setAll] = useState<AttendanceRecord[]>([]);

  const [range, setRange] = useState(defaultRange());
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const from = range.from ? format(range.from, "yyyy-MM-dd") : undefined;
    const to = range.to ? format(range.to, "yyyy-MM-dd") : undefined;
    getAttendance(user.id, from, to)
      .then(setAll)
      .catch(() => setAll([]));
  }, [user, range]);

  const filtered = useMemo(
    () => all.sort((a, b) => b.date.localeCompare(a.date)),
    [all]
  );

  const counts = countByStatus(filtered);

  // Daily series across the selected range
  const barData = useMemo(() => {
    return rangeDays(range).map(d => {
      const key = format(d, "yyyy-MM-dd");
      const recs = filtered.filter(r => r.date === key);
      const c = countByStatus(recs);
      return { name: format(d, "d MMM"), WFO: c.WFO, WFH: c.WFH, CLT: c.CLT, PTO: c.PTO };
    });
  }, [filtered, range]);

  const pieData = (Object.keys(counts) as AttendanceStatus[])
    .filter(k => counts[k] > 0)
    .map(k => ({ name: k, value: counts[k] }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Timesheets</h1>
          <p className="text-sm text-muted-foreground mt-1">Your attendance analytics and history.</p>
          <div className="mt-2"><RangeContext value={range} /></div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <DateRangePicker value={range} onChange={setRange} />
          <Button variant="outline" onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(["WFO","WFH","CLT","PTO"] as AttendanceStatus[]).map(k => (
          <div key={k} className="card-soft p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{k}</p>
            <p className="text-2xl font-bold mt-1.5" style={{ color: STATUS_COLOR[k] }}>{counts[k]}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="card-soft p-6 lg:col-span-2">
          <h3 className="font-bold mb-1">Daily Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">Stacked counts by status</p>
          <div className="h-72">
            {barData.length === 0 ? (
              <EmptyState text="No data for this period" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Bar dataKey="WFO" stackId="a" fill={STATUS_COLOR.WFO} />
                  <Bar dataKey="WFH" stackId="a" fill={STATUS_COLOR.WFH} />
                  <Bar dataKey="CLT" stackId="a" fill={STATUS_COLOR.CLT} />
                  <Bar dataKey="PTO" stackId="a" fill={STATUS_COLOR.PTO} radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="card-soft p-6">
          <h3 className="font-bold mb-1">Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Share of work modes</p>
          <div className="h-72">
            {pieData.length === 0 ? (
              <EmptyState text="No data for this period" />
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {pieData.map(p => <Cell key={p.name} fill={STATUS_COLOR[p.name as AttendanceStatus]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="card-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-bold">Attendance History</h3>
            <p className="text-xs text-muted-foreground">{filtered.length} records in selection</p>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-16"><EmptyState text="No attendance records for this period" /></div>
        ) : (
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Day</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Time Marked</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.date} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5 font-medium">{format(new Date(r.date), "dd MMM yyyy")}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{format(new Date(r.date), "EEEE")}</td>
                    <td className="px-6 py-3.5"><span className={STATUS_BADGE[r.status]}>{r.status}</span></td>
                    <td className="px-6 py-3.5 text-right text-muted-foreground tabular-nums">
                      {format(new Date(r.markedAt), "hh:mm a")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export My Attendance"
        reportTitle={`Attendance — ${user?.fullName}`}
        fileName={`my-attendance-${format(new Date(), "yyyy-MM-dd")}`}
        initialRange={range}
        getRows={(r) => filterRecords(all, r).sort((a, b) => a.date.localeCompare(b.date))}
        columns={[
          { header: "Date", get: (r) => format(new Date(r.date), "dd MMM yyyy") },
          { header: "Day", get: (r) => format(new Date(r.date), "EEEE") },
          { header: "Status", get: (r) => r.status },
          { header: "Marked At", get: (r) => format(new Date(r.markedAt), "hh:mm a") },
          { header: "Edited", get: (r) => (r.edited ? "Yes" : "No") },
        ]}
      />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-full grid place-items-center text-center">
      <div>
        <div className="h-12 w-12 mx-auto rounded-full bg-muted grid place-items-center mb-3">
          <span className="text-xl">📭</span>
        </div>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
