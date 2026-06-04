import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import AppShell from "./AppShell";
import AuthLoadingScreen from "./AuthLoadingScreen";

export default function ProtectedRoute({
  children, role,
}: { children: React.ReactNode; role?: "user" | "admin" }) {
  const { user, role: current, isReady } = useAuth();

  // Prevent browser back-forward cache from showing unauth pages
  useEffect(() => {
    const handlePageshow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was restored from back-forward cache
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageshow);
    return () => window.removeEventListener("pageshow", handlePageshow);
  }, []);

  if (!isReady) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && role !== current) return <Navigate to={current === "admin" ? "/admin" : "/dashboard"} replace />;
  return <AppShell>{children}</AppShell>;
}
