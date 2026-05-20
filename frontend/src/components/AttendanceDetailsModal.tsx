import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AttendanceRecord, AttendanceStatus } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  WFO: "bg-blue-100 text-blue-800 border-blue-300",
  WFH: "bg-green-100 text-green-800 border-green-300",
  CLT: "bg-purple-100 text-purple-800 border-purple-300",
  PTO: "bg-orange-100 text-orange-800 border-orange-300",
  HOL: "bg-cyan-100 text-cyan-800 border-cyan-300",
};

const STATUS_LABEL: Record<string, string> = {
  WFO: "Work From Office",
  WFH: "Work From Home",
  CLT: "Client Location",
  PTO: "Paid Time Off",
  HOL: "Holiday",
};

interface AttendanceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: number;
  year: number;
  type: string | null;
  records: AttendanceRecord[];
}

export default function AttendanceDetailsModal({
  open,
  onOpenChange,
  month,
  year,
  type,
  records,
}: AttendanceDetailsModalProps) {
  const details = useMemo(() => {
    if (!type) return [];
    return records
      .filter((record) => {
        const d = new Date(record.date);
        return (
          d.getMonth() + 1 === month &&
          d.getFullYear() === year &&
          record.status === (type as AttendanceStatus)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, type, month, year]);

  const getStatusColor = (status: string) => {
    return STATUS_COLOR[status] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getMonthYearLabel = () => {
    return format(new Date(year, month - 1), "MMMM yyyy");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <DialogTitle className="text-lg">
              {type && STATUS_LABEL[type]} Details
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">{getMonthYearLabel()}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {details.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No attendance records found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {details.map((detail) => {
                const date = new Date(detail.date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                
                return (
                  <div
                    key={detail.date}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      "hover:bg-muted/50 transition-colors",
                      isWeekend ? "bg-muted/30" : "bg-background"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {format(date, "EEEE")}, {format(date, "MMM dd yyyy")}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <p className="text-[11px] text-muted-foreground">
                            Marked at {format(new Date(detail.markedAt), "hh:mm a")}
                          </p>
                          {isWeekend && <span className="text-[11px] text-muted-foreground">• Weekend</span>}
                        </div>
                      </div>
                    </div>
                    {type && (
                      <div className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ml-2",
                        getStatusColor(type)
                      )}>
                        {type}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {details.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <p className="text-xs text-muted-foreground text-center">
              Total: <span className="font-semibold">{details.length}</span> records
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
