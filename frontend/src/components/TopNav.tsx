import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getPendingDeletionRequests, PENDING_DELETION_REQUESTS_CHANGED_EVENT } from "@/lib/api";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import NotificationsBell from "./NotificationsBell";
import { useEffect, useState } from "react";
import LogoutConfirmDialog from "./LogoutConfirmDialog";

const PENDING_REQUESTS_POLL_INTERVAL_MS = 60000;

export default function TopNav() {
  const { user, role, logout } = useAuth();
  const nav = useNavigate();
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    if (role !== "admin") return;

    const syncCount = () => {
      getPendingDeletionRequests()
        .then((requests) => setPendingRequestCount(requests.length))
        .catch(() => setPendingRequestCount(0));
    };

    syncCount();

    const onPendingChanged = () => syncCount();
    window.addEventListener(PENDING_DELETION_REQUESTS_CHANGED_EVENT, onPendingChanged);

    const interval = setInterval(syncCount, PENDING_REQUESTS_POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      window.removeEventListener(PENDING_DELETION_REQUESTS_CHANGED_EVENT, onPendingChanged);
    };
  }, [role]);

  const links = role === "admin"
    ? [{ to: "/admin", label: "Home" }, { to: "/admin/monitor", label: "Monitor" }]
    : [{ to: "/dashboard", label: "Home" }, { to: "/timesheets", label: "Timesheets" }];

  const handleLogout = () => {
    logout();
    toast.success("Signed out");
    setLogoutOpen(false);
    nav("/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 xl:px-8 h-16 flex items-center justify-between">
        <Link to={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2.5">
          <img
            src="/srmtech-logo.png"
            alt="SRMTech"
            className="h-9 w-auto object-contain"
            loading="eager"
            decoding="async"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-[15px]">Attendly</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {role === "admin" ? "Admin Console" : "Workspace"}
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 bg-muted/60 rounded-full p-1">
          {links.map(l => (
            <div key={l.to} className="relative">
              <NavLink to={l.to} end
                className={({ isActive }) =>
                  `px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    isActive ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`
                }>
                {l.label}
              </NavLink>
              {l.label === "Monitor" && pendingRequestCount > 0 && (
                <div className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full -translate-y-1 translate-x-1" title={`${pendingRequestCount} pending deletion request(s)`} />
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <NotificationsBell />
          
          {/* Profile section - hidden on tablet/mobile, visible on desktop only */}
          <div className="hidden lg:block">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full pr-3 pl-1 py-1 hover:bg-muted transition-colors">
                <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold text-white"
                  style={{ background: user?.avatarColor }}>
                  {user?.fullName.split(" ").map(n => n[0]).slice(0,2).join("")}
                </div>
                <div className="flex flex-col leading-tight items-start">
                  <span className="text-xs font-semibold">{user?.fullName}</span>
                  <span className="text-[10px] text-muted-foreground">{user?.employeeId}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {role === "user" && (
                  <DropdownMenuItem onClick={() => nav("/profile")}>
                    <UserIcon className="h-4 w-4 mr-2" /> View Profile
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setLogoutOpen(true)}>
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Logout icon - visible on tablet, hidden on mobile and desktop */}
          <button
            onClick={() => setLogoutOpen(true)}
            className="hidden md:inline-flex lg:hidden items-center justify-center h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Logout"
          >
            <LogOut className="h-4.5 w-4.5" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={handleLogout}
      />
    </header>
  );
}
