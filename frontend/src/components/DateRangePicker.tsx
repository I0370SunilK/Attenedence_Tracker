import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange, rangeLabel, rangeThisMonth, rangeThisWeek, rangeToday } from "@/lib/dateRange";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isAfter, startOfDay } from "date-fns";

interface Props {
  value: DateRange;
  onChange: (r: DateRange) => void;
}

const PRESETS = [
  { id: "today", label: "Today", build: rangeToday },
  { id: "week", label: "This Week", build: rangeThisWeek },
  { id: "month", label: "This Month", build: rangeThisMonth },
] as const;

export default function DateRangePicker({ value, onChange }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const startYear = 2020;
  const endYear = today.getFullYear();

  const [open, setOpen] = useState(false);
  
  // Independent states for From and To
  const [selectedFrom, setSelectedFrom] = useState<Date | undefined>(undefined);
  const [selectedTo, setSelectedTo] = useState<Date | undefined>(undefined);
  
  // Independent navigation states for From and To calendars
  const [fromMonth, setFromMonth] = useState<Date>(today);
  const [toMonth, setToMonth] = useState<Date>(today);

  // Sync internal state when popover opens
  useEffect(() => {
    if (open) {
      const f = value.from ? new Date(value.from) : undefined;
      const t = value.to ? new Date(value.to) : undefined;
      setSelectedFrom(f);
      setSelectedTo(t);
      setFromMonth(f || today);
      setToMonth(t || today);
    }
  }, [open, value, today]);

  const handleApply = () => {
    if (selectedFrom && selectedTo) {
      // Ensure From <= To
      const f = selectedFrom <= selectedTo ? selectedFrom : selectedTo;
      const t = selectedFrom <= selectedTo ? selectedTo : selectedFrom;
      
      onChange({
        preset: "custom",
        from: startOfDay(f),
        to: startOfDay(t)
      });
      setOpen(false);
    }
  };

  return (
    <div className="grid w-full grid-cols-2 gap-1 bg-card border border-border rounded-xl p-1 shadow-sm sm:inline-flex sm:w-auto sm:grid-cols-none">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.build())}
          className={cn(
            "min-w-0 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
            value.preset === p.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {p.label}
        </button>
      ))}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "col-span-2 flex min-w-0 items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors sm:col-span-1",
              value.preset === "custom"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {value.preset === "custom" ? (
              <>
                <span className="sm:hidden">{format(value.from, "dd MMM")} - {format(value.to, "dd MMM")}</span>
                <span className="hidden sm:inline">{format(value.from, "dd MMM yyyy")} - {format(value.to, "dd MMM yyyy")}</span>
              </>
            ) : "Custom"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-1.5rem)] p-0 sm:w-auto" align="end">
          <div className="w-full p-3 sm:w-[720px] sm:p-5">
            <div className="mb-5">
              <h4 className="font-semibold text-sm">Pick a custom range</h4>
              <p className="text-xs text-muted-foreground">Choose start and end dates. Future dates are disabled.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-10">
              {/* FROM SECTION */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">From</label>
                  <div className={cn(
                    "p-2 border rounded-md text-sm font-medium transition-colors",
                    selectedFrom ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                  )}>
                    {selectedFrom ? format(selectedFrom, "dd MMM yyyy") : "Select start date"}
                  </div>
                </div>
                <div className="border rounded-md bg-background">
                  <Calendar
                    mode="single"
                    selected={selectedFrom}
                    onSelect={setSelectedFrom}
                    month={fromMonth}
                    onMonthChange={setFromMonth}
                    disabled={(date) => isAfter(date, today)}
                    fromYear={startYear}
                    toYear={endYear}
                    captionLayout="dropdown-buttons"
                    className="p-3"
                  />
                </div>
              </div>

              {/* TO SECTION */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">To</label>
                  <div className={cn(
                    "p-2 border rounded-md text-sm font-medium transition-colors",
                    selectedTo ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                  )}>
                    {selectedTo ? format(selectedTo, "dd MMM yyyy") : "Select end date"}
                  </div>
                </div>
                <div className="border rounded-md bg-background">
                  <Calendar
                    mode="single"
                    selected={selectedTo}
                    onSelect={setSelectedTo}
                    month={toMonth}
                    onMonthChange={setToMonth}
                    disabled={(date) => isAfter(date, today)}
                    fromYear={startYear}
                    toYear={endYear}
                    captionLayout="dropdown-buttons"
                    className="p-3"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleApply}
                disabled={!selectedFrom || !selectedTo}
              >
                Apply Range
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function RangeContext({ value }: { value: DateRange }) {
  return (
    <p className="text-xs text-muted-foreground">
      Showing data for: <span className="font-semibold text-foreground">{rangeLabel(value)}</span>
    </p>
  );
}
