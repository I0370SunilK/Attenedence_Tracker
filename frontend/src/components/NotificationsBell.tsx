import { useEffect, useState } from "react";
import { Bell, Check, AlertTriangle, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppNotification, timeAgo } from "@/lib/notifications";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const ICONS: Record<string, React.ElementType> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  alert: AlertCircle,
};

const TYPE_CLASSES: Record<string, string> = {
  info: "text-primary bg-primary/10",
  success: "text-success bg-success-soft",
  warning: "text-warning bg-warning-soft",
  alert: "text-destructive bg-destructive/10",
};

export default function NotificationsBell() {
  const nav = useNavigate();
  const { items, unreadCount, markRead, markAllRead, refreshNotifications, refreshUnreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<AppNotification | null>(null);

  useEffect(() => {
    if (!open) return;
    void refreshNotifications();
    void refreshUnreadCount();
  }, [open, refreshNotifications, refreshUnreadCount]);

  const handleAction = (n: AppNotification) => {
    markRead(n.id);
    setOpen(false);
    if (n.actionRoute) nav(n.actionRoute);
  };

  const handleClick = (n: AppNotification) => {
    markRead(n.id);
    setDetail(n);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            aria-label="Notifications"
            className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-muted transition-colors"
          >
            <Bell className="h-[18px] w-[18px] text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground grid place-items-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[360px] p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-sm font-bold">Notifications</p>
              <p className="text-[11px] text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={markAllRead}>
                <Check className="h-3.5 w-3.5 mr-1" /> Mark all read
              </Button>
            )}
          </div>
          <ScrollArea className="max-h-[420px]">
            {items.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <ul>
                {items.map(n => {
                  const Icon = ICONS[n.type];
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleClick(n)}
                        className={cn(
                          "w-full text-left px-4 py-3 flex gap-3 border-b border-border/60 hover:bg-muted/50 transition-colors",
                          !n.read && "bg-primary/[0.03]"
                        )}
                      >
                        <span className={cn("h-8 w-8 rounded-lg grid place-items-center shrink-0", TYPE_CLASSES[n.type])}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("text-sm truncate", !n.read ? "font-semibold" : "font-medium")}>
                              {n.title}
                            </p>
                            {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                          <p className="text-[11px] text-muted-foreground/80 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <span className={cn("h-10 w-10 rounded-xl grid place-items-center", TYPE_CLASSES[detail.type])}>
                    {(() => { const I = ICONS[detail.type]; return <I className="h-5 w-5" />; })()}
                  </span>
                  <div>
                    <DialogTitle className="text-left">{detail.title}</DialogTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(detail.createdAt), "d MMM yyyy · hh:mm a")}
                    </p>
                  </div>
                </div>
                <DialogDescription className="pt-3 text-sm leading-relaxed">
                  {detail.message}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
                {detail.actionRoute && (
                  <Button onClick={() => { handleAction(detail); setDetail(null); }}>
                    {detail.actionLabel ?? "Open"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
