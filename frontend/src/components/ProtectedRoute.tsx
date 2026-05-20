import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import AppShell from "./AppShell";
import AuthLoadingScreen from "./AuthLoadingScreen";

export default function ProtectedRoute({
  children, role,
}: { children: React.ReactNode; role?: "user" | "admin" }) {
  const { user, role: current, isReady } = useAuth();
  if (!isReady) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && role !== current) return <Navigate to={current === "admin" ? "/admin" : "/dashboard"} replace />;
  return <AppShell>{children}</AppShell>;
}
