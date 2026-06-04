import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import AuthLoadingScreen from "./AuthLoadingScreen";

export default function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) return <AuthLoadingScreen />;
  if (user) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
