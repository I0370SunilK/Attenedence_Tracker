export type NotificationType = "info" | "warning" | "success" | "alert";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO
  read: boolean;
  actionLabel?: string;
  actionRoute?: string;
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export function seedUserNotifications(): AppNotification[] {
  return [
    {
      id: "n1",
      type: "warning",
      title: "Attendance not marked",
      message: "You haven't marked attendance for today. Mark it before EOD.",
      createdAt: minutesAgo(15),
      read: false,
      actionLabel: "Mark now",
      actionRoute: "/dashboard",
    },
    {
      id: "n2",
      type: "info",
      title: "Weekly summary ready",
      message: "Your weekly attendance summary for last week is available.",
      createdAt: minutesAgo(60 * 6),
      read: false,
      actionLabel: "View timesheets",
      actionRoute: "/timesheets",
    },
    {
      id: "n3",
      type: "success",
      title: "🔥 4-day streak!",
      message: "You've maintained attendance for 4 working days in a row.",
      createdAt: minutesAgo(60 * 26),
      read: true,
    },
    {
      id: "n4",
      type: "info",
      title: "Holiday next Friday",
      message: "Republic Day — office will remain closed.",
      createdAt: minutesAgo(60 * 48),
      read: true,
    },
  ];
}

export function seedAdminNotifications(): AppNotification[] {
  return [
    {
      id: "a1",
      type: "alert",
      title: "5 employees not marked today",
      message: "Several team members haven't logged attendance yet.",
      createdAt: minutesAgo(20),
      read: false,
      actionLabel: "Open monitor",
      actionRoute: "/admin/monitor",
    },
    {
      id: "a2",
      type: "warning",
      title: "Below threshold",
      message: "3 employees are below 4 office days this month.",
      createdAt: minutesAgo(60 * 4),
      read: false,
      actionLabel: "View dashboard",
      actionRoute: "/admin",
    },
    {
      id: "a3",
      type: "success",
      title: "Monthly report exported",
      message: "Last month's attendance report was downloaded.",
      createdAt: minutesAgo(60 * 30),
      read: true,
    },
  ];
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
