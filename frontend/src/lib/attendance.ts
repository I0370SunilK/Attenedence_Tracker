import { AttendanceRecord, AttendanceStatus, PRIORITY } from "./types";

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export function isSameMonth(date: string, ref = new Date()) {
  const d = new Date(date);
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
}

export function countByStatus(records: AttendanceRecord[]) {
  const c: Record<AttendanceStatus, number> = { WFO:0, WFH:0, CLT:0, PTO:0, HOL:0 };
  records.forEach(r => {
    if (r.status in c) c[r.status]++;
  });
  return c;
}

export function workingDaysInMonth(ref = new Date()) {
  const y = ref.getFullYear(), m = ref.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= last; d++) {
    const dow = new Date(y, m, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export function notMarkedThisMonth(records: AttendanceRecord[], ref = new Date()) {
  return notMarkedDatesThisMonth(records, ref).length;
}

/** Returns array of date strings (YYYY-MM-DD) that are days without attendance */
export function notMarkedDatesThisMonth(records: AttendanceRecord[], ref = new Date(), includeWeekends = false) {
  const monthRecs = records.filter(r => isSameMonth(r.date, ref));
  const now = new Date();
  const lastDay = ref.getMonth() === now.getMonth() && ref.getFullYear() === now.getFullYear()
    ? now.getDate()
    : new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const result: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const dt = new Date(ref.getFullYear(), ref.getMonth(), d);
    const dow = dt.getDay();
    if (!includeWeekends && (dow === 0 || dow === 6)) continue;
    // Use local date string to avoid UTC offset issues
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;
    if (!monthRecs.find(r => r.date === key)) result.push(key);
  }
  return result;
}

export function leaderboardScore(c: Record<AttendanceStatus, number>) {
  return c.WFO * PRIORITY.WFO + c.CLT * PRIORITY.CLT + c.WFH * PRIORITY.WFH + c.PTO * PRIORITY.PTO + c.HOL * PRIORITY.HOL;
}

export function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const dow = x.getDay(); // 0 Sun
  const diff = dow === 0 ? -6 : 1 - dow; // start Monday
  x.setDate(x.getDate() + diff);
  x.setHours(0,0,0,0);
  return x;
}

export function weeklyCounts(records: AttendanceRecord[], ref = new Date()) {
  const start = startOfWeek(ref);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const week = records.filter(r => {
    const d = new Date(r.date);
    return d >= start && d < end;
  });
  return countByStatus(week);
}

/** Consecutive working days (Mon–Fri) with WFO/WFH/CLT, walking backward from today. PTO/HOL do not break the streak. */
export function attendanceStreak(records: AttendanceRecord[]) {
  const map = new Map(records.map((r) => [r.date, r]));
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60; i++) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      const r = map.get(dateKey(d));
      if (!r) break;
      if (r.status === "WFO" || r.status === "WFH" || r.status === "CLT") {
        streak++;
      } else if (r.status === "PTO" || r.status === "HOL") {
        // marked leave day — skip without breaking prior working days
      } else {
        break;
      }
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function getEarliestEditableMonthStart(today = new Date()): Date {
  const y = today.getFullYear();
  const m = today.getMonth();
  if (m === 0) {
    return new Date(y - 1, 10, 1); // Nov 1 of previous year when current is January
  }
  return new Date(y, 0, 1); // Jan 1 of current year
}

export function isEditable(date: string) {
  const target = new Date(date); target.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  if (target > today) return false;
  const min = getEarliestEditableMonthStart(today);
  return target >= min;
}
