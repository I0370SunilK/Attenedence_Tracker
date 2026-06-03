import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { LogOut, User as UserIcon, Shield, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import NotificationsBell from "./NotificationsBell";
import { useState } from "react";
import LogoutConfirmDialog from "./LogoutConfirmDialog";

export default function TopNav() {
  const { user, role, logout } = useAuth();
  const nav = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Signed out");
    setLogoutOpen(false);
    nav("/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        <Link to="/dashboard" className="flex items-center gap-2.5">
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
              Workspace
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 bg-muted/60 rounded-full p-1">
          <NavLink to="/dashboard" end
            className={({ isActive }) =>
              `px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                isActive ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`
            }>
            Home
          </NavLink>
          <NavLink to="/timesheets"
            className={({ isActive }) =>
              `px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                isActive ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`
            }>
            Timesheets
          </NavLink>
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
                <DropdownMenuItem onClick={() => nav("/profile")}>
                  <UserIcon className="h-4 w-4 mr-2" /> View Profile
                </DropdownMenuItem>
                {role === "admin" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => nav("/admin")}>
                      <Shield className="h-4 w-4 mr-2" /> Go to Admin Dashboard
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
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
