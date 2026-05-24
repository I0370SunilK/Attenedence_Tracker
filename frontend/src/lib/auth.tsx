import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { role?: Role; user?: Employee };
    if (!parsed?.user?.id) return null;
    return { role: parsed.role ?? "user", user: parsed.user };
  } catch {
    return null;
  }
}

function saveSession(role: Role, user: Employee) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ role, user }));
}

function deriveRole(user: Employee): Role {
  return user.employeeId.toLowerCase().startsWith("admin") ? "admin" : "user";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialSession] = useState(() => loadSession());
  const [user, setUser] = useState<Employee | null>(initialSession?.user ?? null);
  const [role, setRoleState] = useState<Role>(initialSession?.role ?? "user");
  const [isReady, setIsReady] = useState(Boolean(initialSession));

  useEffect(() => {
    fetchCurrentUser()
      .then((current) => {
        if (current) {
          const derivedRole = deriveRole(current);
          setUser(current);
          setRoleState(derivedRole);
          saveSession(derivedRole, current);
          setIsReady(true);
          return;
        }

        setUser(null);
        setRoleState("user");
        localStorage.removeItem(SESSION_KEY);
      })
      .catch(() => {
        // Session cache only — employee/attendance data always comes from MongoDB Atlas via API.
        if (initialSession) {
          return;
        }
      })
      .finally(() => {
        setIsReady(true);
      });
  }, [initialSession]);

  const login = ({ role: loginRole, user: loginUser }: { role: Role; user: Employee }) => {
    setUser(loginUser);
    setRoleState(loginRole);
    setIsReady(true);
    saveSession(loginRole, loginUser);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
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
      saveSession(role, nextUser);
    } else {
      localStorage.removeItem(SESSION_KEY);
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
