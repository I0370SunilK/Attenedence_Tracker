/** Fired after attendance is saved so Timesheets/Admin refetch from MongoDB Atlas. */
export const ATTENDANCE_CHANGED_EVENT = "attendly:attendance-changed";

export function emitAttendanceChanged() {
  window.dispatchEvent(new CustomEvent(ATTENDANCE_CHANGED_EVENT));
}
