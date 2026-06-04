import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { Employee } from "./types";
import { fetchCurrentUser, logoutUser } from "./api";

type Role = "user" | "admin";
interface AuthState {
  user: Employee | null;
  role: Role;
  isReady: boolean;
  login: (payload: { role: Role; user: Employee }) => void;
  logout: () => void;
  setRole: (r: Role) => void;
  setUser: (user: Employee | null) => void;
}

const AuthCtx = createContext<AuthState | null>(null);
const SESSION_KEY = "att_session";

function loadSession(): { role: Role; user: Employee } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { role?: Role; user?: Employee };
    if (!parsed?.user?.id) return null;
    return { role: parsed.role ?? "user", user: parsed.user };
  } catch {
    return null;
  }
}

function saveSession(role: Role, user: Employee) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role, user }));
}

function clearAuthStorage() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Best-effort only.
  }

  try {
    if (typeof window !== "undefined") {
      sessionStorage.clear();
    }
  } catch {
    // Best-effort only.
  }
}

function clearAllCookies() {
  if (typeof document === "undefined") {
    return;
  }

  try {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name] = cookie.split("=");
      if (!name) continue;
      const trimmed = name.trim();
      document.cookie = `${trimmed}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
      document.cookie = `${trimmed}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname};`;
    }
  } catch {
    // Best-effort only.
  }
}

/**
 * Derive role from the employee document.
 * Uses the role field from MongoDB first, falls back to employeeId check for backward compatibility.
 */
function deriveRole(user: Employee, fallback?: Role): Role {
  // If role is explicitly set in MongoDB, use it.
  if (user.role === "admin" || user.role === "user") {
    return user.role as Role;
  }
  // Preserve the previously stored session role when possible.
  if (fallback) {
    return fallback;
  }
  // Fallback: derive from employeeId prefix for backward compatibility.
  return user.employeeId.toLowerCase().startsWith("admin") ? "admin" : "user";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialSession] = useState(() => loadSession());
  const [user, setUser] = useState<Employee | null>(initialSession?.user ?? null);
  const [role, setRoleState] = useState<Role>(initialSession?.role ?? "user");
  const [isReady, setIsReady] = useState(false);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Function to verify and refresh auth state
  const verifyAuth = () => {
    fetchCurrentUser()
      .then((current) => {
        if (current) {
          const derivedRole = deriveRole(current, initialSession?.role);
          setUser(current);
          setRoleState(derivedRole);
          saveSession(derivedRole, current);
          setIsReady(true);
          return;
        }

        setUser(null);
        setRoleState("user");
        sessionStorage.removeItem(SESSION_KEY);
        setIsReady(true);
      })
      .catch(() => {
        // Session cache only — employee/attendance data always comes from MongoDB Atlas via API.
        if (initialSession) {
          setIsReady(true);
          return;
        }
        setIsReady(true);
      });
  };

  useEffect(() => {
    verifyAuth();
  }, [initialSession]);

  // Re-validate auth on browser back/forward and visibility changes
  useEffect(() => {
    const handlePopState = () => {
      verifyAuth();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Re-verify auth when tab becomes visible
        verifyAuth();
      }
    };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initialSession]);

  // Inactivity timeout - logout after 10 minutes of no activity
  useEffect(() => {
    if (!user) {
      // Clear timeout if user is not logged in
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      return;
    }

    const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

    const handleLogoutDueToInactivity = () => {
      setUser(null);
      setRoleState("user");
      clearAuthStorage();
      clearAllCookies();
      void logoutUser().catch(() => {
        // If the backend is unavailable we still clear local session state.
      });
    };

    const resetInactivityTimer = () => {
      // Clear existing timeout
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }

      // Set new timeout
      inactivityTimeoutRef.current = setTimeout(() => {
        handleLogoutDueToInactivity();
      }, INACTIVITY_TIMEOUT);
    };

    // Activity events to listen for
    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    // Reset timer on any user activity
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Initialize the timer
    resetInactivityTimer();

    // Add event listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [user]);

  // Logout on tab close / unload so session cookie doesn't persist when user closes the tab.
  useEffect(() => {
    if (!user) {
      return;
    }

    const handleUnload = () => {
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/auth/logout", "");
        } else {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/auth/logout", false);
          xhr.send(null);
        }
      } catch {
        // Best-effort only.
      }
      clearAuthStorage();
      clearAllCookies();
    };

    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [user]);

  const login = ({ role: loginRole, user: loginUser }: { role: Role; user: Employee }) => {
    setUser(loginUser);
    setRoleState(loginRole);
    setIsReady(true);
    saveSession(loginRole, loginUser);
  };

  const logout = () => {
    setUser(null);
    setRoleState("user");
    setIsReady(true);
    clearAuthStorage();
    clearAllCookies();
    void logoutUser().catch(() => {
      // If the backend is unavailable we still clear local session state.
    });
  };

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    if (user) saveSession(newRole, user);
  };

  const updateUser = (nextUser: Employee | null) => {
    setUser(nextUser);
    if (nextUser) {
      // Re-derive role from updated user data
      const newRole = deriveRole(nextUser);
      setRoleState(newRole);
      saveSession(newRole, nextUser);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  };

  return (
    <AuthCtx.Provider value={{ user, role, isReady, login, logout, setRole, setUser: updateUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}