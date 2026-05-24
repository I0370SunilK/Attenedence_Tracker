import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { LogOut, ChevronDown, Monitor, ArrowLeft } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState } from "react";
import LogoutConfirmDialog from "./LogoutConfirmDialog";

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

  return (
    <div className="min-h-[100dvh] bg-gradient-soft w-full overflow-x-hidden">
      <div className="w-full overflow-x-hidden">
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-6 xl:px-8 h-16 flex items-center justify-between">
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
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Admin Console
                </span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1 bg-muted/60 rounded-full p-1">
              <Link to="/admin"
                className="px-4 py-1.5 text-sm font-medium rounded-full bg-card shadow-sm text-foreground">
                Dashboard
              </Link>
              <Link to="/admin/monitor"
                className="px-4 py-1.5 text-sm font-medium rounded-full text-muted-foreground hover:text-foreground">
                <Monitor className="h-3.5 w-3.5 inline mr-1" /> Monitor
              </Link>
            </nav>

            <div className="flex items-center gap-1">
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
        </header>
      </div>
      <main className="w-full overflow-x-hidden">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 xl:px-8 py-8 pb-20 md:pb-8 min-w-0">
          {children}
        </div>
      </main>

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={handleLogout}
      />
    </div>
  );
}