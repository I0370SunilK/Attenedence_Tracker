import { useState, useEffect, useCallback, useRef } from "react";
import { fetchNotifications, fetchUnreadNotifications, markNotificationRead, markAllNotificationsRead, NotificationItem } from "@/lib/api";
import { AppNotification, NotificationType } from "@/lib/notifications";
import { useAuth } from "@/lib/auth";

const UNREAD_POLL_INTERVAL_MS = 120000;

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toAppNotification = (n: NotificationItem): AppNotification => ({
    ...n,
    type: n.type as NotificationType,
  });

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const all = await fetchNotifications();
      setItems(all.map(toAppNotification));
    } catch (err) {
      console.error("[notifications] fetch error:", err);
    }
  }, [user]);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const unread = await fetchUnreadNotifications();
      setUnreadCount(unread.length);
    } catch (err) {
      console.error("[notifications] unread fetch error:", err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    void refreshUnreadCount();

    intervalRef.current = setInterval(() => {
      void refreshUnreadCount();
    }, UNREAD_POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshUnreadCount, user]);

  const markRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      setItems(prev => prev.map(i => (i.id === id ? { ...i, read: true } : i)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead();
      setItems(prev => prev.map(i => ({ ...i, read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  }, [user]);

  return { items, unreadCount, markRead, markAllRead, refreshNotifications, refreshUnreadCount };
}
