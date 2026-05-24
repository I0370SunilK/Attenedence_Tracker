import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import AuthLoadingScreen from "@/components/AuthLoadingScreen";

export default function Index() {
  const { user, isReady } = useAuth();
  if (!isReady) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  // Always go to employee dashboard first, regardless of role
  // Admin can access admin dashboard via profile dropdown menu
  return <Navigate to="/dashboard" replace />;
}