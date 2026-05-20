import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildAnalyticsReport, generateAnalyticsCSV, generateAnalyticsPDF } from "@/lib/analyticsExport";
import { DateRange, defaultRange, rangeLabel } from "@/lib/dateRange";
import { AttendanceRecord, Employee } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import DateRangePicker from "@/components/DateRangePicker";

export type ExportFormat = "pdf" | "csv";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  attendance: Record<string, AttendanceRecord[]>;
  initialRange?: DateRange;
}

export default function FullReportAnalyticsDialog({
  open,
  onOpenChange,
  employees,
  attendance,
  initialRange,
}: Props) {
  const [range, setRange] = useState<DateRange>(initialRange ?? defaultRange());
  const [fmt, setFmt] = useState<ExportFormat>("pdf");
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    if (busy) return;

    setBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const analyticsData = buildAnalyticsReport(employees, attendance, range);
      const periodLabel = rangeLabel(range);

      if (fmt === "pdf") {
        generateAnalyticsPDF(analyticsData, periodLabel);
      } else {
        const csv = generateAnalyticsCSV(analyticsData, periodLabel);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `analytics-report-${new Date().toISOString().split("T")[0]}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
      }

      toast.success(`${fmt.toUpperCase()} report downloaded`, {
        description: `${analyticsData.leaderboard.length} employees | ${analyticsData.top5.length} top performers | ${periodLabel}`,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to generate report");
      console.error(error);
    } finally {
      setBusy(false);
    }
  };

  const hasData = employees.length > 0;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Full Analytics Report</DialogTitle>
          <DialogDescription>
            Download comprehensive attendance analytics including leaderboard, top performers, and insights.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Date Range
            </Label>
            <div className="mt-2">
              <DateRangePicker value={range} onChange={setRange} />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Format
            </Label>
            <RadioGroup
              value={fmt}
              onValueChange={(value) => setFmt(value as ExportFormat)}
              className="mt-2 grid grid-cols-2 gap-3"
            >
              <label
                htmlFor="pdf"
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                  fmt === "pdf" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="pdf" id="pdf" />
                <FileText className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-sm font-semibold">PDF</p>
                  <p className="text-[11px] text-muted-foreground">Print-ready</p>
                </div>
              </label>

              <label
                htmlFor="csv"
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                  fmt === "csv" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="csv" id="csv" />
                <FileSpreadsheet className="h-4 w-4 text-success" />
                <div>
                  <p className="text-sm font-semibold">CSV</p>
                  <p className="text-[11px] text-muted-foreground">For spreadsheets</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">Employees in database</p>
            <p className={`text-sm font-bold tabular-nums ${hasData ? "text-foreground" : "text-muted-foreground"}`}>
              {employees.length}
            </p>
          </div>

          <div className="space-y-1 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Report includes:</p>
            <ul className="ml-2 space-y-1">
              <li>- Leaderboard (all employees)</li>
              <li>- Top 5 employees by office presence</li>
              <li>- Consistent in-office employees (&gt;= 12 days)</li>
              <li>- Employees with &lt; 4 office days</li>
              <li>- Fully remote employees</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={!hasData || busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Download {fmt.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
