import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { LogOut, ChevronDown, Monitor, ArrowLeft, Home, User as UserIcon } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState } from "react";
import LogoutConfirmDialog from "./LogoutConfirmDialog";
import NotificationsBell from "./NotificationsBell";
import { cn } from "@/lib/utils";

export default function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Signed out");
    setLogoutOpen(false);
    nav("/login");
  };

  const mobileNavItems = [
    { label: "Home", path: "/admin", icon: Home, end: true },
    { label: "Monitor", path: "/admin/monitor", icon: Monitor },
    { label: "Employee", path: "/dashboard", icon: ArrowLeft },
    { label: "Profile", path: "/profile", icon: UserIcon },
  ];

  return (
    <div className="min-h-[100dvh] bg-gradient-soft w-full overflow-x-hidden">
      <div className="w-full overflow-x-hidden">
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/srmtech-logo.png"
                alt="SRMTech"
                className="h-9 w-auto object-contain"
                loading="eager"
                decoding="async"
              />
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-[15px]">Attendly</span>
                <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Admin Console
                </span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1 bg-muted/60 rounded-full p-1">
              <NavLink to="/admin" end
                className={({ isActive }) =>
                  `px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    isActive ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink to="/admin/monitor"
                className={({ isActive }) =>
                  `px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    isActive ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <Monitor className="h-3.5 w-3.5 inline mr-1" /> Monitor
              </NavLink>
            </nav>

            <div className="flex items-center gap-1">
              <NotificationsBell />
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 rounded-full pr-2 sm:pr-3 pl-1 py-1 hover:bg-muted transition-colors">
                    <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold text-white"
                      style={{ background: user?.avatarColor }}>
                      {user?.fullName.split(" ").map(n => n[0]).slice(0,2).join("")}
                    </div>
                    <div className="hidden sm:flex flex-col leading-tight items-start min-w-0">
                      <span className="text-xs font-semibold max-w-32 truncate">{user?.fullName}</span>
                      <span className="text-[10px] text-muted-foreground">{user?.employeeId}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Admin Menu</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => nav("/dashboard")}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back to Employee Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLogoutOpen(true)}>
                      <LogOut className="h-4 w-4 mr-2" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>
      </div>
      <main className="w-full overflow-x-hidden">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8 pb-24 md:pb-8 min-w-0">
          {children}
        </div>
      </main>

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={handleLogout}
      />
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden">
        <div className="grid grid-cols-5 items-center bg-card/95 backdrop-blur-xl border-t border-border rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-1 py-1 safe-area-bottom">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex min-w-0 flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-8 rounded-lg transition-all duration-200",
                      isActive && "bg-primary/10"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 transition-all duration-200",
                        isActive && "scale-110"
                      )}
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold tracking-tight transition-all duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setLogoutOpen(true)}
            className="flex min-w-0 flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground"
          >
            <div className="flex items-center justify-center w-10 h-8 rounded-lg">
              <LogOut className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <span className="text-[10px] font-semibold tracking-tight">Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
