import { format } from "date-fns";
import { dateKey, startOfWeek } from "./attendance";
import { AttendanceRecord, AttendanceStatus } from "./types";

export type RangePreset = "today" | "week" | "month" | "custom";

export interface DateRange {
  preset: RangePreset;
  from: Date;
  to: Date; // inclusive
}

export function rangeToday(): DateRange {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  return { preset: "today", from: day, to: day };
}

export function rangeThisWeek(): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = startOfWeek(today);
  const weekEnd = new Date(from);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(0, 0, 0, 0);
  const to = weekEnd > today ? today : weekEnd;
  return { preset: "week", from, to };
}

export function rangeThisMonth(): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  monthEnd.setHours(0, 0, 0, 0);
  const to = monthEnd > today ? today : monthEnd;
  return { preset: "month", from, to };
}

export function defaultRange(): DateRange {
  return rangeThisMonth();
}

export function inRange(date: string, range: DateRange) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);

  const to = new Date(range.to);
  to.setHours(23, 59, 59, 999);

  return day >= from && day <= to;
}

export function filterRecords(records: AttendanceRecord[], range: DateRange) {
  return records.filter((record) => inRange(record.date, range));
}

export function rangeLabel(range: DateRange) {
  if (range.preset === "today") return `Today | ${format(range.from, "d MMM yyyy")}`;
  if (range.preset === "week") return `This Week | ${format(range.from, "d MMM")} - ${format(range.to, "d MMM")}`;
  if (range.preset === "month") return format(range.from, "MMMM yyyy");
  return `${format(range.from, "d MMM yyyy")} - ${format(range.to, "d MMM yyyy")}`;
}

export function rangeDays(range: DateRange): Date[] {
  const days: Date[] = [];
  const current = new Date(range.from);
  current.setHours(0, 0, 0, 0);

  const end = new Date(range.to);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

export function dayDistribution(
  attendance: Record<string, AttendanceRecord[]>,
  employeeIds: string[],
  range: DateRange
) {
  const days = rangeDays(range);
  return days.map((day) => {
    const key = dateKey(day);
    const counts: Record<AttendanceStatus | "NONE", number> = {
      WFO: 0,
      WFH: 0,
      CLT: 0,
      PTO: 0,
      HOL: 0,
      NONE: 0,
    };

    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

    employeeIds.forEach((employeeId) => {
      const record = (attendance[employeeId] || []).find((entry) => entry.date === key);
      if (record) counts[record.status]++;
      else if (!isWeekend) counts.NONE++;
    });

    return {
      key,
      date: day,
      label: format(day, "dd MMM"),
      ...counts,
    };
  });
}
