import { NavLink } from "react-router-dom";
import { Home, Clock, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";
import LogoutConfirmDialog from "./LogoutConfirmDialog";

const NAV_ITEMS = [
  { label: "Home", icon: Home },
  { label: "Timesheets", icon: Clock },
  { label: "Profile", icon: User },
];

export default function MobileBottomNav() {
  const { role, logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const getPath = (label: string) => {
    switch (label) {
      case "Home":
        return role === "admin" ? "/admin" : "/dashboard";
      case "Timesheets":
        return "/timesheets";
      case "Profile":
        return "/profile";
      default:
        return "/";
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Signed out");
    setLogoutOpen(false);
    window.location.href = "/login";
  };

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden">
        <div className="flex items-center justify-around bg-card/95 backdrop-blur-xl border-t border-border rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2 py-1 safe-area-bottom">
          {NAV_ITEMS.map((item) => {
            const path = getPath(item.label);
            return (
              <NavLink
                key={item.label}
                to={path}
                end={item.label === "Home"}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-0.5 py-2 px-4 rounded-xl transition-all duration-200",
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
            );
          })}

          {/* Logout button */}
          <button
            onClick={() => setLogoutOpen(true)}
            className="flex flex-col items-center gap-0.5 py-2 px-4 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground"
          >
            <div className="flex items-center justify-center w-10 h-8 rounded-lg">
              <LogOut className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <span className="text-[10px] font-semibold tracking-tight">
              Logout
            </span>
          </button>
        </div>
      </nav>

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={handleLogout}
      />
    </>
  );
}