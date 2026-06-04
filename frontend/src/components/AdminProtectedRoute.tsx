import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import AdminShell from "./AdminShell";
import AuthLoadingScreen from "./AuthLoadingScreen";

export default function AdminProtectedRoute({
  children,
}: { children: React.ReactNode }) {
  const { user, role, isReady } = useAuth();

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
  if (role !== "admin") return <Navigate to="/dashboard" replace />;
  return <AdminShell>{children}</AdminShell>;
}