import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import DateRangePicker from "@/components/DateRangePicker";
import { DateRange, defaultRange, rangeLabel } from "@/lib/dateRange";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportFormat = "pdf" | "csv";

export interface ExportColumn {
  header: string;
  /** Returns a string cell. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: (row: any) => string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  /** Get rows for the selected range. Return [] if none. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRows: (range: DateRange) => any[];
  columns: ExportColumn[];
  /** File base name (without extension) */
  fileName: string;
  /** Title rendered inside the PDF report */
  reportTitle?: string;
  /** Optional initial range; defaults to current month */
  initialRange?: DateRange;
}

export default function ExportDialog({
  open, onOpenChange, title, getRows, columns, fileName, reportTitle, initialRange,
}: Props) {
  const [range, setRange] = useState<DateRange>(initialRange ?? defaultRange());
  const [fmt, setFmt] = useState<ExportFormat>("pdf");
  const [busy, setBusy] = useState(false);

  const rows = getRows(range);
  const hasData = rows.length > 0;

  const downloadCSV = () => {
    const head = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(",");
    const body = rows.map(r => columns.map(c => {
      const v = c.get(r) ?? "";
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(",")).join("\n");
    const csv = head + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${fileName}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const t = reportTitle ?? title;
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text(t, 40, 40);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(120);
    doc.text(`Period: ${rangeLabel(range)}`, 40, 58);
    doc.text(`Generated: ${format(new Date(), "d MMM yyyy · hh:mm a")}`, 40, 72);
    autoTable(doc, {
      startY: 90,
      head: [columns.map(c => c.header)],
      body: rows.map(r => columns.map(c => c.get(r))),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [60, 80, 180], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 252] },
    });
    doc.save(`${fileName}.pdf`);
  };

  const handleDownload = async () => {
    if (!hasData || busy) return;
    setBusy(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      if (fmt === "pdf") downloadPDF();
      else downloadCSV();
      toast.success(`${fmt.toUpperCase()} report downloaded`, {
        description: `${rows.length} rows · ${rangeLabel(range)}`,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to generate report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Choose a date range and format. The report will include {columns.length} columns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Date Range
            </Label>
            <div className="mt-2"><DateRangePicker value={range} onChange={setRange} /></div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Format
            </Label>
            <RadioGroup value={fmt} onValueChange={(v) => setFmt(v as ExportFormat)} className="grid grid-cols-2 gap-3 mt-2">
              <label htmlFor="pdf" className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${fmt === "pdf" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                <RadioGroupItem value="pdf" id="pdf" />
                <FileText className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-sm font-semibold">PDF</p>
                  <p className="text-[11px] text-muted-foreground">Print-ready</p>
                </div>
              </label>
              <label htmlFor="csv" className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${fmt === "csv" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                <RadioGroupItem value="csv" id="csv" />
                <FileSpreadsheet className="h-4 w-4 text-success" />
                <div>
                  <p className="text-sm font-semibold">CSV</p>
                  <p className="text-[11px] text-muted-foreground">For spreadsheets</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="rounded-xl bg-muted/50 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Records in selection</p>
            <p className={`text-sm font-bold tabular-nums ${hasData ? "text-foreground" : "text-muted-foreground"}`}>
              {rows.length}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleDownload} disabled={!hasData || busy}>
            {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
              : <><Download className="h-4 w-4 mr-2" /> Download {fmt.toUpperCase()}</>}
          </Button>
        </DialogFooter>
        {!hasData && (
          <p className="text-[11px] text-warning -mt-2 text-right">No data in this range — adjust dates to enable download.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
