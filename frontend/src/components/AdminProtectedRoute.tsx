import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import AdminShell from "./AdminShell";
import AuthLoadingScreen from "./AuthLoadingScreen";

export default function AdminProtectedRoute({
  children,
}: { children: React.ReactNode }) {
  const { user, role, isReady } = useAuth();
  if (!isReady) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/dashboard" replace />;
  return <AdminShell>{children}</AdminShell>;
}