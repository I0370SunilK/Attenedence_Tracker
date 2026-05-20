import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import AuthLoadingScreen from "@/components/AuthLoadingScreen";

export default function Index() {
  const { user, role, isReady } = useAuth();
  if (!isReady) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;
}
