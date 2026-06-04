# Admin Module Full-Stack Explanation

This document is written for a developer who must explain the admin-specific flow of the Attendance Tracker application in front of senior technical employees and managers.

It covers the frontend and backend admin modules with detailed explanations of the code, architecture, execution flow, and why each piece exists.

---

## 1. Frontend Overview

The admin frontend is built in React with TypeScript and Tailwind CSS. It uses a client-side routing model with `react-router-dom`, an auth context for session state, React Query for data fetching, and reusable UI components.

The admin-specific frontend files are:

- `frontend/src/App.tsx`
- `frontend/src/components/AdminProtectedRoute.tsx`
- `frontend/src/components/AdminShell.tsx`
- `frontend/src/lib/auth.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/pages/AdminDashboard.tsx`
- `frontend/src/pages/Monitor.tsx`

These files work together to enforce role-based access, render the admin UX, and call backend APIs.

### 1.1 `frontend/src/App.tsx`

This file is the root of the client-side application.

#### Line-by-line explanation

1. `import { QueryClient, QueryClientProvider } from "@tanstack/react-query";`
   - What: Imports React Query objects.
   - Why: React Query manages asynchronous data fetching, caching, and invalidation.
   - Purpose: Provides a single query client to the app, so all data fetches use the same cache and configuration.

2. `import { BrowserRouter, Route, Routes } from "react-router-dom";`
   - What: Imports React Router components.
   - Why: BrowserRouter provides browser-based navigation and URL sync.
   - Purpose: Defines route mapping between URLs and React components.

3. `import { Toaster as Sonner } from "@/components/ui/sonner";`
   - What: Imports a toast notification component.
   - Why: To show user feedback like success or error messages.
   - Alternative: could use any toast library, but this project uses a custom wrapper.

4. `import { Toaster } from "@/components/ui/toaster";`
   - What: Imports the app notification container.
   - Why: It renders toast notifications for the UI.

5. `import { TooltipProvider } from "@/components/ui/tooltip";`
   - What: Imports a provider for tooltips.
   - Why: Enables consistent tooltip styling across the app.

6. `import { AuthProvider } from "@/lib/auth";`
   - What: Imports the authentication context provider.
   - Why: AuthProvider supplies user and role state to the application.

7. `import ProtectedRoute from "@/components/ProtectedRoute";`
   - What: Imports a wrapper that protects authenticated pages.
   - Why: Ensures only logged-in users can access core application routes.

8. `import AdminProtectedRoute from "@/components/AdminProtectedRoute";`
   - What: Imports admin-specific route guard.
   - Why: Ensures only admins can access admin pages and admin-only routes.

9. `import GuestRoute from "@/components/GuestRoute";`
   - What: Imports a route wrapper for non-authenticated users.
   - Why: Redirects signed-in users away from login/signup pages.

10. `import ErrorBoundary from "@/components/ErrorBoundary";`
    - What: Imports a component that catches rendering errors.
    - Why: Prevents the entire app from crashing by displaying a fallback UI.

11. `import Index from "./pages/Index";`
    - What: The public landing page.
    - Why: It is the root route for unauthenticated visitors.

12. `import Login from "./pages/Login";`
    - What: The login page component.
    - Why: Admins and users start authentication here.

13. `import Signup from "./pages/Signup";`
    - What: The signup page component.
    - Why: Allows new users to register.

14. `import Dashboard from "./pages/Dashboard";`
    - What: The main employee dashboard.
    - Why: Accessible to normal users and admin users when switched to employee mode.

15. `import Timesheets from "./pages/Timesheets";`
    - What: The personal timesheet management page.
    - Why: Not admin-specific but part of overall flow.

16. `import Profile from "./pages/Profile";`
    - What: The user profile page.
    - Why: Admins can still update their profile.

17. `import AdminDashboard from "./pages/AdminDashboard";`
    - What: Admin-specific overview page.
    - Why: Central admin experience with attendance import, analytics, and monitoring.

18. `import Monitor from "./pages/Monitor";`
    - What: Admin monitoring page.
    - Why: Supports admin actions such as deletion request approvals and attendance inspection.

19. `import NotFound from "./pages/NotFound";`
    - What: Fallback page for unknown routes.
    - Why: Provides a graceful response when a user enters an invalid URL.

20. `const queryClient = new QueryClient({ ... });`
    - What: Creates a global React Query client.
    - Why: Configures stale time, cache time, and refetch behavior.
    - Problem solved: Prevents excessive refetching and avoids stale data inconsistencies.

21. `const App = () => ( ... );`
    - What: Defines the app's root component.
    - Why: Organizes providers and routing in a single layout.
    - Execution Flow: React renders App, which mounts the providers and routes.

22. `<QueryClientProvider client={queryClient}>`
    - What: Wraps the app with query client context.
    - Why: So all child components can use hooks like `useQuery` and `useMutation`.

23. `<ErrorBoundary>`
    - What: Wraps the app with error-handling boundaries.
    - Why: Catches runtime errors in the component tree.

24. `<TooltipProvider>`
    - What: Provides tooltip state to children.
    - Why: Ensures tooltips render correctly and consistently.

25. `<Toaster />` and `<Sonner ... />`
    - What: Renders toast layers for notifications.
    - Why: Makes success/error messages visible.

26. `<BrowserRouter>`
    - What: Enables browser-based routing.
    - Why: Keeps UI in sync with the URL and enables history navigation.

27. `<AuthProvider>`
    - What: Provides authentication context.
    - Why: Stores user session and role across pages.

28. `<Routes>` with route definitions
    - What: Defines path-to-component mappings.
    - Why: Controls which component is rendered for each URL.

29. `Route path="/" element={<Index />} />`
    - What: Root landing page.
    - Why: Default public entry point.

30. `Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />`
    - What: Login route.
    - Why: Enforces that signed-in users cannot access login again.

31. `Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />`
    - What: Signup route.
    - Why: Only guests should use sign up.

32. `Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />`
    - What: Employee dashboard route.
    - Why: Requires user to be authenticated.

33. `Route path="/timesheets" element={<ProtectedRoute><Timesheets /></ProtectedRoute>} />`
    - What: Timesheets route.
    - Why: Requires authenticated session.

34. `Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />`
    - What: Profile route.
    - Why: Authenticated users only.

35. `Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />`
    - What: Admin overview route.
    - Why: Only admins may use this page.
    - Importance: This is the main admin entry point.

36. `Route path="/admin/monitor" element={<AdminProtectedRoute><Monitor /></AdminProtectedRoute>} />`
    - What: Admin monitor route.
    - Why: Provides admin actions and audit operations.

37. `Route path="*" element={<NotFound />} />`
    - What: Fallback route for unknown URLs.
    - Why: Improves UX and prevents blank screens.

38. `export default App;`
    - What: Exports the root component.
    - Why: This component is mounted in `frontend/src/main.tsx`.

---

### 1.2 `frontend/src/components/AdminProtectedRoute.tsx`

This component protects admin-only routes.

#### Code and explanation

1. `import { Navigate } from "react-router-dom";`
   - What: Imports navigation helper to redirect.
   - Why: We need to send unauthorized users away.

2. `import { useAuth } from "@/lib/auth";`
   - What: Imports auth context hook.
   - Why: We need the current user and role.

3. `import AdminShell from "./AdminShell";`
   - What: Imports the admin layout wrapper.
   - Why: Admin pages share navigation and styling.

4. `import AuthLoadingScreen from "./AuthLoadingScreen";`
   - What: Imports a loading placeholder.
   - Why: Auth context may still be resolving from session.

5. `export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {`
   - What: Defines a component that accepts children.
   - Why: It wraps any admin page component with access checks.
   - Inputs: `children` is the content to render when authorized.

6. `const { user, role, isReady } = useAuth();`
   - What: Reads current auth state.
   - Why: We need to know if authentication is loaded and whether the user is admin.

7. `if (!isReady) return <AuthLoadingScreen />;`
   - What: If session resolution is in progress, show a loading screen.
   - Why: Prevents flicker and incorrect redirects before auth is known.

8. `if (!user) return <Navigate to="/login" replace />;`
   - What: If no authenticated user exists, redirect to login.
   - Why: Keeps admin routes protected.

9. `if (role !== "admin") return <Navigate to="/dashboard" replace />;`
   - What: If the user is authenticated but not admin, redirect to employee dashboard.
   - Why: Role-based authorization prevents unauthorized access.

10. `return <AdminShell>{children}</AdminShell>;`
    - What: Wrap the authorized admin page inside the admin layout.
    - Why: Ensures admin pages have a consistent shell and menu.

---

### 1.3 `frontend/src/components/AdminShell.tsx`

This component renders the shared admin user interface chrome.

#### Code and explanation

1. `import { ReactNode } from "react";`
   - What: Imports the type used for children.
   - Why: TypeScript support for `children`.

2. `import { Link, NavLink, useNavigate } from "react-router-dom";`
   - What: Routing support for links and navigation.
   - Why: Provides internal navigation controls.

3. `import { useAuth } from "@/lib/auth";`
   - What: Auth context hook.
   - Why: Displays the current user and handles logout.

4. `import { LogOut, ChevronDown, Monitor, ArrowLeft, Home, User as UserIcon } from "lucide-react";`
   - What: Icon components.
   - Why: Improves visual clarity and UI affordances.

5. `import { DropdownMenu, ... } from "@/components/ui/dropdown-menu";`
   - What: Imports menu components.
   - Why: Builds a reusable admin dropdown menu.

6. `import { toast } from "sonner";`
   - What: Notification library.
   - Why: Shows success messages after logout.

7. `import { useState } from "react";`
   - What: React hook for component local state.
   - Why: Tracks whether logout confirmation is visible.

8. `import LogoutConfirmDialog from "./LogoutConfirmDialog";`
   - What: Confirmation dialog for logout.
   - Why: Prevents accidental logout.

9. `import NotificationsBell from "./NotificationsBell";`
   - What: Notification bell UI.
   - Why: Admins see new notifications.

10. `import { cn } from "@/lib/utils";`
    - What: Utility for conditional class names.
    - Why: Simplifies Tailwind class composition.

11. `export default function AdminShell({ children }: { children: ReactNode }) {`
    - What: Defines the shell component with children.
    - Why: Creates a consistent top-level admin wrapper.

12. `const { user, logout } = useAuth();`
    - What: Gets authenticated user and logout function.
    - Why: Displays user info and runs logout logic.

13. `const nav = useNavigate();`
    - What: Gets navigation function.
    - Why: Needed for redirect after logout or navigation items.

14. `const [logoutOpen, setLogoutOpen] = useState(false);`
    - What: Tracks whether logout dialog is open.
    - Why: Controls modal visibility.

15. `const handleLogout = () => { ... };`
    - What: Logs user out and redirects to login.
    - Why: Clears session and updates UI.
    - Execution flow: logout() clears auth state, toast success shown, dialog closed, navigate to login.

16. `const mobileNavItems = [ ... ];`
    - What: Defines the admin bottom navigation items.
    - Why: Provides mobile-friendly navigation inside the admin console.

17. The return JSX block
    - What: Outputs the admin layout markup.
    - Why: Provides header, nav links, children area, and footer mobile navigation.

18. `header` section
    - What: Sticky top header with logo and navigation.
    - Why: Keeps admin controls visible during scrolling.

19. Desktop nav using `NavLink`
    - What: Two admin links: Dashboard and Monitor.
    - Why: Lets admins switch pages.
    - Note: `NavLink` can style active state.

20. User dropdown menu
    - What: Shows current admin initials and name.
    - Why: Allows logout and switching back to employee dashboard.

21. `<main>{children}</main>`
    - What: Renders the child admin page inside the shell.
    - Why: Provides a frame around the active admin content.

22. `LogoutConfirmDialog` and mobile nav
    - What: Additional UI for logout confirmation and small-screen navigation.
    - Why: Completes the admin experience.

### 1.4 `frontend/src/lib/auth.tsx`

This module manages authentication state and session persistence.

#### Code and explanation

1. `import { createContext, useContext, useEffect, useState, ReactNode } from "react";`
   - What: React primitives for state, context, and side effects.
   - Why: Implements auth provider as a React context.

2. `import { Employee } from "./types";`
   - What: Employee type definition.
   - Why: Provides type safety for user objects.

3. `import { fetchCurrentUser, logoutUser } from "./api";`
   - What: Backend API functions.
   - Why: Auth provider fetches the current user and logs out via backend.

4. `type Role = "user" | "admin";`
   - What: Defines a union type for roles.
   - Why: Restricts role values to valid options.

5. `interface AuthState { ... }`
   - What: Defines what auth context contains.
   - Why: Makes the context contract explicit.

6. `const AuthCtx = createContext<AuthState | null>(null);`
   - What: Creates an auth context object.
   - Why: Allows child components to consume auth state.

7. `const SESSION_KEY = "att_session";`
   - What: Defines local storage key.
   - Why: Persists session state client-side across refreshes.

8. `function loadSession(): { role: Role; user: Employee } | null { ... }`
   - What: Reads stored session data from local storage.
   - Why: Restores auth state quickly on page load.
   - Execution: parses JSON, checks for valid user id.

9. `function saveSession(role: Role, user: Employee) { ... }`
   - What: Writes the current auth session to local storage.
   - Why: Preserves session between refreshes.

10. `function clearAuthStorage() { ... }`
    - What: Removes auth-related storage and cookies.
    - Why: Ensures session is fully cleared on logout.

11. `function clearAllCookies() { ... }`
    - What: Clears all document cookies in the browser.
    - Why: Defensive cleanup in case stale cookies remain.

12. `function deriveRole(user: Employee, fallback?: Role): Role { ... }`
    - What: Determines whether the user is admin.
    - Why: Combines explicit `role` field with legacy `employeeId` logic.
    - Problem solved: Backward compatibility for old records without role field.

13. `export function AuthProvider({ children }: { children: ReactNode }) { ... }`
    - What: Defines the provider component.
    - Why: Makes auth available to the app.
    - Execution flow: initialize from local session, then fetch current user from backend.

14. `const [initialSession] = useState(() => loadSession());`
    - What: Loads the session once during mount.
    - Why: Avoids repeated local storage reads.

15. `const [user, setUser] = useState<Employee | null>(initialSession?.user ?? null);`
    - What: Creates state for the current user object.
    - Why: Tracks login state.

16. `const [role, setRoleState] = useState<Role>(initialSession?.role ?? "user");`
    - What: Creates state for the role.
    - Why: Role controls authorization and routing.

17. `const [isReady, setIsReady] = useState(Boolean(initialSession));`
    - What: Indicates whether auth initialization is complete.
    - Why: Prevents early rendering of protected routes.

18. `useEffect(() => { ... }, [initialSession]);`
    - What: Fetches current user from backend when the app mounts.
    - Why: Validates the stored session and refreshes user data.
    - Flow:
      - call `fetchCurrentUser()`
      - if current user exists, derive role and persist
      - if missing, clear local storage
      - always set `isReady(true)` at end

19. `const login = ({ role: loginRole, user: loginUser }: ...) => { ... };`
    - What: Updates auth state after successful login.
    - Why: Allows components to sign in and persist the session.

20. `const logout = () => { ... };`
    - What: Clears auth state locally and in browser storage.
    - Why: Signs the user out completely.
    - Internal flow: clears session, cookies, and invokes backend logout.

21. `const setRole = (newRole: Role) => { ... };`
    - What: Allows role changes in session state.
    - Why: Useful for role updates without full reload.

22. `const updateUser = (nextUser: Employee | null) => { ... };`
    - What: Replaces the authenticated user.
    - Why: Keeps local session in sync with backend changes.

23. `return <AuthCtx.Provider value={{ ... }}>{children}</AuthCtx.Provider>;`
    - What: Makes auth data available via context.
    - Why: Centralizes auth state.

24. `export function useAuth() { ... }`
    - What: Exposes a hook for consuming auth context.
    - Why: Simplifies auth access in components.

### 1.5 `frontend/src/lib/api.ts`

This module defines the frontend API layer and maps it to backend endpoints.

#### Code and explanation

1. `import { Employee, AttendanceRecord, DeletionRequest } from "./types";`
   - What: Imports shared TypeScript interfaces.
   - Why: Ensures API responses are strongly typed.

2. `const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";`
   - What: Reads optional base URL from environment.
   - Why: Allows local development and deployment behind proxies.
   - Execution: If environment variable is not set, use same-origin.

3. `async function request<T>(path: string, opts: RequestInit = {}): Promise<T> { ... }`
   - What: Wraps fetch with shared behavior.
   - Why: Centralizes error handling and credentials.
   - Flow:
     - call `fetch(BASE_URL + path)` with credentials included
     - if response not OK, parse error text or JSON to create an Error
     - if 204 status, return undefined
     - otherwise parse JSON and return typed response

4. `export async function fetchCurrentUser(): Promise<Employee | null> { ... }`
   - What: Retrieves the current authenticated user.
   - Why: Used by `auth.tsx` to bootstrap session state.
   - Endpoint: `GET /api/auth/me`

5. `export async function loginUser(empId: string, password: string): Promise<{ user: Employee; role: "user" | "admin" }> { ... }`
   - What: Sends credentials to login endpoint.
   - Why: Authenticates users and receives their role.
   - Endpoint: `POST /api/auth/login`

6. `export async function signupUser(payload: Partial<Employee> & { password: string }): Promise<{ user: Employee; role: "user" | "admin" }> { ... }`
   - What: Sends signup data to backend.
   - Why: Creates a new employee record.
   - Endpoint: `POST /api/auth/signup`

7. `export async function logoutUser(): Promise<void> { ... }`
   - What: Calls backend logout.
   - Why: Clears server-side session cookie.
   - Endpoint: `POST /api/auth/logout`

8. `export async function changePassword(currentPassword: string, newPassword: string): Promise<void> { ... }`
   - What: Sends a password change request.
   - Why: Allows user password updating.
   - Endpoint: `PUT /api/auth/password`

9. `export async function updateProfile(payload: Pick<Employee, "designation" | "team" | "email" | "city">): Promise<Employee> { ... }`
   - What: Updates current user profile.
   - Why: Keeps profile data in sync.
   - Endpoint: `PUT /api/auth/me`

10. `export async function checkEmailExists(email: string): Promise<boolean> { ... }`
    - What: Checks if an email is already registered.
    - Why: Used by signup form validation.
    - Endpoint: `POST /api/auth/check-email`

11. `export async function forgotPasswordReset(email: string, newPassword: string): Promise<void> { ... }`
    - What: Resets the password for a user.
    - Why: Supports forgotten password workflows.
    - Endpoint: `POST /api/auth/forgot-password-reset`

12. `export async function getEmployees(): Promise<Employee[]> { ... }`
    - What: Retrieves all employees.
    - Why: Admin dashboard and monitor need the full employee list.
    - Endpoint: `GET /api/employees`

13. `export async function importEmployeeDetails(file: File, month?: number, year?: number): Promise<EmployeeDetailsImportResult> { ... }`
    - What: Uploads employee details import file.
    - Why: Admin can bulk-import employee records.
    - Endpoint: `POST /api/employees/import-details`

14. `export async function previewEmployeeDetails(file: File, month?: number, year?: number): Promise<EmployeeDetailsImportResult> { ... }`
    - What: Sends a preview request without performing import.
    - Why: Helps admins verify file contents before committing.
    - Endpoint: `POST /api/employees/import-details` with `preview=true`

15. `export async function previewAttendanceImport(file: File, month: number, year: number): Promise<AttendanceImportResult> { ... }`
    - What: Generates a preview for attendance import files.
    - Why: Prevents accidental bad imports.
    - Endpoint: `POST /api/attendance/import-excel` with `mode=preview`

16. `export async function importAttendanceExcel(file: File, month: number, year: number, mode: AttendanceImportMode): Promise<AttendanceImportResult> { ... }`
    - What: Processes attendance import.
    - Why: Admin imports attendance data from Excel.

17. `export async function getDeletionRequestStatus(employeeId: string): Promise<DeletionRequest> { ... }`
    - What: Retrieves deletion request state for one employee.
    - Why: Monitors request progress.
    - Endpoint: `GET /api/employees/{employeeId}/deletion-request`

18. `export async function sendDeletionRequest(employeeId: string): Promise<DeletionRequest> { ... }`
    - What: Creates a deletion request.
    - Why: Lets employees request account removal.
    - Endpoint: `POST /api/employees/{employeeId}/deletion-request`

19. `export async function getPendingDeletionRequests(): Promise<DeletionRequest[]> { ... }`
    - What: Retrieves admin-visible pending deletion requests.
    - Why: Admin monitor page uses this list.
    - Endpoint: `GET /api/employees/deletion-requests`

20. `export async function approveDeletionRequest(employeeId: string): Promise<DeletionRequest> { ... }`
    - What: Approves a user deletion request.
    - Why: Admin action handled in the monitor page.
    - Endpoint: `POST /api/employees/deletion-requests/{employeeId}/approve`

21. `export async function dismissDeletionRequest(employeeId: string): Promise<void> { ... }`
    - What: Dismisses a deletion request.
    - Why: Admin can reject or cancel requests.
    - Endpoint: `POST /api/employees/deletion-requests/{employeeId}/dismiss`

22. `export async function getAttendance(employeeId: string, from?: string, to?: string): Promise<AttendanceRecord[]> { ... }`
    - What: Retrieves attendance for a single employee.
    - Why: Used when admin inspects one employee.
    - Endpoint: `GET /api/attendance/{employeeId}?from=...&to=...`

23. `export async function getAttendanceForEmployees(employeeIds: string[], from?: string, to?: string): Promise<Record<string, AttendanceRecord[]>> { ... }`
    - What: Retrieves attendance for multiple employees.
    - Why: Used for dashboard analytics and monitor page.
    - Endpoint: `GET /api/attendance?employeeIds=...&from=...&to=...`

24. `export async function markAttendance(employeeId: string, record: Omit<AttendanceRecord, "edited">): Promise<AttendanceRecord[]> { ... }`
    - What: Posts attendance records.
    - Why: Not admin-specific, but part of employee attendance operations.

25. Notification helper functions
    - What: fetch notifications, mark read, etc.
    - Why: Admin UI may show notifications across the app.

26. Event constant `PENDING_DELETION_REQUESTS_CHANGED_EVENT`
    - What: A custom window event name.
    - Why: Allows UI components to re-fetch when deletion request state changes.

27. `emitPendingDeletionRequestsChanged()`
    - What: Dispatches the custom event.
    - Why: Sends cross-component update signals.

### 1.6 `frontend/src/pages/Monitor.tsx`

This is the admin monitor page. It is one of the two admin pages and contains the approval workflow.

#### Code explanation

1. `import { useEffect, useMemo, useState } from "react";`
   - What: React hooks for lifecycle, memoization, and local state.
   - Why: The page uses stateful UI and derived values.

2. `import { DeletionRequest, Employee, AttendanceRecord, AttendanceStatus, DESIGNATION_RANK, STATUS_BADGE, STATUS_COLOR } from "@/lib/types";`
   - What: Import domain models and constants.
   - Why: Types and UI constants are used for rendering and logic.

3. `import { countByStatus } from "@/lib/attendance";`
   - What: Helper that counts attendance records by status.
   - Why: Converts raw attendance events into summary counts.

4. `import { approveDeletionRequest, dismissDeletionRequest, emitPendingDeletionRequestsChanged, getAttendance } from "@/lib/api";`
   - What: Admin API client functions.
   - Why: Executes backend actions for deletion request approvals and employee detail inspection.

5. `import { ATTENDANCE_CHANGED_EVENT } from "@/lib/attendanceEvents";`
   - What: Event name constant.
   - Why: Triggers real-time refresh when attendance changes.

6. `import { useEmployees, useAttendanceForEmployees, usePendingDeletionRequests } from "@/lib/queries";`
   - What: React Query hooks.
   - Why: Fetch data with caching and refetching.

7. `import { Input } from "@/components/ui/input";` and `Button`, `Card`.
   - What: UI components for form controls.
   - Why: Standardizes look and feel.

8. `import { Search, ArrowLeft, Download, FileText, Mail, MapPin, CalendarDays } from "lucide-react";`
   - What: Icon components.
   - Why: Improves page affordances.

9. `import { toast } from "sonner";`
   - What: Toast notifications.
   - Why: Displays success and error results for admin actions.

10. `import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";`
    - What: Date utilities.
    - Why: Computes ranges, formatting, and calendar logic.

11. `import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";`
    - What: Charting components.
    - Why: Visualization of attendance trends.

12. `import { DateRange, filterRecords } from "@/lib/dateRange";`
    - What: Types and helpers for date range filtering.
    - Why: Supports custom date filtering for employee detail views.

13. `import { buildEmployeeReportData, EmployeeReportFormat, generateEmployeeReportCSV, generateEmployeeReportPDF } from "@/lib/employeeReportExport";`
    - What: Report export utilities.
    - Why: Enables exporting employee attendance reports.

14. `const today = useMemo(() => { ... }, []);`
    - What: Creates a normalized date representing today at midnight.
    - Why: Avoids timezone differences during comparisons.
    - Flow: `new Date()` → set hours, minutes, seconds, milliseconds to zero.

15. `const [q, setQ] = useState("");`
    - What: Search query state.
    - Why: Filters employee list by name, id, or team.

16. `const [selected, setSelected] = useState<Employee | null>(null);`
    - What: Currently selected employee.
    - Why: Toggles between list and detail views.

17. `const monthFrom = format(startOfMonth(today), "yyyy-MM-dd");`
    - What: Start of current month string.
    - Why: Requests current month attendance.

18. `const monthTo = format(today, "yyyy-MM-dd");`
    - What: Today's date string.
    - Why: Limits attendance query up to today.

19. `const employeesQuery = useEmployees();`
    - What: Fetches all employees.
    - Why: Needed to render list and look up deletion request employee names.

20. `const employees = employeesQuery.data ?? [];`
    - What: Default to empty array if query not ready.
    - Why: Prevents runtime errors while data loads.

21. `const attendanceQuery = useAttendanceForEmployees(employees.map((e) => e.id).filter(Boolean), monthFrom, monthTo);`
    - What: Fetches attendance for the current employee set.
    - Why: Provides the attendance summary used in the employee cards.
    - Logic: collects ids, filters out invalid values.

22. `const monthAttendance = attendanceQuery.data ?? {};`
    - What: Attendance data keyed by employee id.
    - Why: Used for status counts and detail pages.

23. `const pendingRequestsQuery = usePendingDeletionRequests();`
    - What: Fetches pending deletion requests.
    - Why: Admin monitor page displays requests.

24. `const requests = pendingRequestsQuery.data ?? [];`
    - What: Safe default before data loads.

25. `const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);`
    - What: Tracks current approval in progress.
    - Why: Disables buttons while request is pending.

26. `const [dismissingRequestId, setDismissingRequestId] = useState<string | null>(null);`
    - What: Tracks current dismiss operation.

27. `useEffect(() => { ... }, [attendanceQuery, pendingRequestsQuery]);`
    - What: Subscribes to the attendance changed event.
    - Why: Refreshes data when attendance is updated elsewhere.
    - Flow: `window.addEventListener` on mount, cleanup remove event.

28. `const list = useMemo(() => { ... }, [employees, q]);`
    - What: Sorts and filters employees.
    - Why: Makes search and order efficient.
    - Logic:
      - copy employees array
      - sort by designation rank
      - filter by name, employeeId, or team using case-insensitive includes

29. `const refreshRequests = async () => { await pendingRequestsQuery.refetch(); }`
    - What: Refreshes the pending request list.
    - Why: Used after approve/dismiss actions.

30. `const handleApproveRequest = async (request: DeletionRequest) => { ... }`
    - What: Approves a deletion request.
    - Why: Admin action to grant account deletion.
    - Flow:
      - set pending button state
      - call API approveDeletionRequest
      - show success toast
      - refresh requests
      - notify listeners via event dispatch
      - handle errors and reset pending state

31. `const handleDismissRequest = async (request: DeletionRequest) => { ... }`
    - What: Dismisses a deletion request.
    - Why: Admin rejects account deletion.
    - Execution: same pattern as approve.

32. `if (selected) return <EmployeeDetail ... />;`
    - What: Conditional rendering of detail view.
    - Why: When an employee is selected, show the detail panel instead of the list.

33. The JSX return block
    - What: Renders the monitor UI.
    - Why: Provides search, request list, and employee cards.
    - Details:
      - header and search field
      - pending deletion requests card
      - employee list cards with status counts
      - click employee to open detail

34. Explanation of class names
    - `space-y-5 sm:space-y-6`: vertical spacing, responsive variant on small screens.
    - `flex flex-col sm:flex-row`: responsive row layout on larger screens.
    - `card-soft`: shared card styling wrapper.
    - `hover:shadow-elevated hover:-translate-y-0.5 transition-all`: hover effect to indicate clickable cards.

35. Why the page uses `useMemo` for `list`
    - `useMemo` prevents recalculation on every render unless `employees` or `q` changes.
    - This is important in admin dashboards where the employee list may be large.

36. Why query data defaults to `[]` or `{}`
    - Avoids rendering errors before the async data is loaded.
    - Makes UI stable during loading and transition states.

37. How button disabling works
    - `disabled={dismissingRequestId === request.id || approvingRequestId === request.id}`
    - Prevents duplicate clicks while a request is processing.

38. The `EmployeeDetail` component
    - Purpose: Provides a deep dive into one employee's attendance data.
    - Inputs:
      - `emp`: the selected employee
      - `monthAttendance`: current month attendance for that employee
      - `onBack`: callback to return to the list view

39. `useEffect(() => { getAttendance(emp.id)... }, [emp.id]);`
    - What: Fetches attendance records when the selected employee changes.
    - Why: Ensures detail view is up to date.

40. `useMemo` for `filtered`, `visibleRecords`, `visibleCounts`
    - What: Computes derived datasets from raw attendance records.
    - Why: Avoids expensive recalculations and ensures responsive UI.

41. Export report flow in `handleDownloadReport`
    - What: Builds report data and triggers PDF or CSV download.
    - Why: Admins need offline or printable employee reports.
    - Flow:
      - build report data
      - generate PDF via library or build CSV blob
      - create anchor link and click to trigger download
      - revoke object URL after download

42. Chart rendering with `recharts`
    - What: Uses `BarChart` and `PieChart` to show attendance distribution.
    - Why: Visual analytics help admins quickly understand trends.

43. Responsive tables and cards
    - Desktop uses table layout with sticky header.
    - Mobile uses stacked card layout for readability.
    - This decision balances density and usability.

44. Why `useMemo` is used in the detail view for the `pie` data and months array
    - Memoized computations avoid recomputing chart data on every render.
    - This is critical when the page contains expensive date math and chart data transformation.

### 1.7 `frontend/src/pages/AdminDashboard.tsx`

This is the main admin overview page where admins import attendance, import employee details, and view multiple analytics.

#### Major responsibilities

- Fetch employee list and attendance for all employees in the selected range
- Show admin stats such as total employees, marked today, not marked today
- Provide import flows for attendance Excel and employee details
- Render leaderboards and insights based on attendance status
- Display dialogs with lists of marked/not-marked employees and missing attendance days

#### Key lines and features

1. `import { useEffect, useMemo, useState } from "react";`
   - Standard React hooks for local state, side-effects, and memoization.

2. `import { useNavigate } from "react-router-dom";`
   - Needed to navigate back to employee dashboard.

3. `import { AttendanceRecord, AttendanceStatus, Employee, STATUS_COLOR } from "@/lib/types";`
   - Types and styling constants used across the page.

4. `import { countByStatus } from "@/lib/attendance";`
   - Converts attendance arrays into status counts.

5. `import { importEmployeeDetails, previewEmployeeDetails, previewAttendanceImport, importAttendanceExcel, type EmployeeDetailsImportResult, type AttendanceImportResult, type AttendanceImportPreviewRow, } from "@/lib/api";`
   - Important admin API calls for import and preview operations.

6. `const [range, setRange] = useState(defaultRange());`
   - Tracks selected date range for analytics.
   - `defaultRange()` likely returns a default range such as month-to-date.

7. `const [selectedEmployeeDetailsFile, setSelectedEmployeeDetailsFile] = useState<File | null>(null);`
   - Tracks the selected details import file.

8. `const [selectedEmployeeDetailsMonth, setSelectedEmployeeDetailsMonth] = useState<number>(today.getMonth() + 1);`
   - Initializes import month to the current month.

9. `const [employeeDetailsPreview, setEmployeeDetailsPreview] = useState<EmployeeDetailsImportResult | null>(null);`
   - Holds preview metadata when admin previews imported employee details.

10. `const employeesQuery = useEmployees();`
    - Fetches employee list via React Query.

11. `const employees = employeesQuery.data ?? [];`
    - Uses data or an empty array before loading.

12. `const employeeIds = employees.map((employee) => employee.id).filter(Boolean);`
    - Extracts valid employee IDs for attendance queries.

13. `const rangeFromKey = format(range.from, "yyyy-MM-dd");`
    - Converts range start date to API-friendly string.

14. `const rangeToKey = format(range.to > today ? today : range.to, "yyyy-MM-dd");`
    - Caps the range end at today to prevent future dates.

15. `const rangeAttendanceQuery = useAttendanceForEmployees(employeeIds, rangeFromKey, rangeToKey);`
    - Fetches attendance for the current range.

16. `const todayAttendanceQuery = useAttendanceForEmployees(employeeIds, todayKey, todayKey);`
    - Fetches only today's attendance for the daily status metrics.

17. `const stats = useMemo(() => { ... }, [employees, todayAttendance, todayKey]);`
    - Computes total, marked, and not marked counts.
    - Why: This is derived state and should be recalculated only when dependencies change.

18. `const markedTodayEmployees = useMemo(() => { ... }, [employees, todayAttendance, todayKey]);`
    - Builds a sorted list of employees who have marked today.

19. `const notMarkedTodayEmployees = useMemo(() => { ... }, [employees, todayAttendance, todayKey]);`
    - Builds a sorted list of employees who have not marked.

20. `const ranked: RankRow[] = useMemo(() => { ... }, [employees, rangeAttendance]);`
    - Creates a leaderboard ranking employees by office days.
    - Logic: sorts by office presence and remote presence, then alphabetically.

21. `const totalWorkingDaysInRange = useMemo(() => { ... }, [range, today]);`
    - Computes the number of working days excluding weekends.
    - Why: Used for office attendance percentage calculations.

22. `const empTotalDays = useMemo(() => { ... }, [ranked]);`
    - Computes total days counted per employee.

23. `const officeMetrics = useMemo(() => { ... }, [ranked, totalWorkingDaysInRange, empTotalDays]);`
    - Computes office days, percentages, and whether the employee meets 3 days/week.

24. `const top5OfficeClient = useMemo(() => [...ranked].sort(...).slice(0, 5), [ranked]);`
    - Picks top employees by office attendance.

25. `const avgOver3PerWeek = ranked.filter(...)`, `below4PerMonth`, `fullyWFH`
    - Builds analytic segments for insights cards.

26. `const yetToMarkAttendance = useMemo(() => { ... }, [employees, range, rangeAttendance, today]);`
    - Computes all working days in the selected range where each employee has no record.
    - Why: Helps admins identify missing attendance on workdays.

27. `const refreshDashboardData = async () => { ... };`
    - Refetches employee and attendance data.
    - Why: Keeps the dashboard current after imports or updates.

28. `useEffect(() => { ... }, [rangeAttendanceQuery, todayAttendanceQuery]);`
    - Subscribes to attendance change events and refreshes queries.

29. `const [reportOpen, setReportOpen] = useState(false);`
    - Tracks whether the full report dialog is open.

30. `const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... };`
    - Updates selected attendance file and resets preview state.

31. `const handleEmployeeDetailsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... };`
    - Updates selected employee details file.

32. `const handlePreviewEmployeeDetails = async () => { ... };`
    - Validates file selection, calls preview API, and stores preview results.
    - Why: Provides immediate feedback before actual import.

33. `const handlePreviewAttendanceImport = async () => { ... };`
    - Validates file selection, performs preview import, and captures errors.
    - Why: Prevents importing corrupt or badly formatted attendance data.

34. `const handleImportExcel = async () => { ... };`
    - Calls the import API in `sync` mode and updates the dashboard.
    - Why: Executes the actual attendance import.

35. `const handleImportEmployeeDetails = async () => { ... };`
    - Calls importEmployeeDetails and records created, updated, skipped counts.
    - Why: Supports bulk employee data onboarding and correction.

36. `const rangeLabel = useMemo(() => { ... }, [range]);`
    - Builds a human-readable label for the selected date range.
    - Why: Used in dashboard sections and charts.

37. The main JSX output of AdminDashboard
    - The page renders:
      - header with admin navigation
      - action buttons for exporting, importing employee details, and importing Excel
      - stat cards for total employees and daily completion
      - a stacked trend chart
      - a leaderboard card
      - insights cards
      - dialogs for marked/not marked and yet-to-mark details
      - import dialogs for Excel and employee details

38. UX decisions in `AdminDashboard`
    - Multiple states are handled with dedicated `useState` variables so the UI can show precise progress messages.
    - Preview and import are separated to avoid destructive operations without confirmation.
    - `useMemo` is heavily used for derived analytics so expensive computations run only when necessary.
    - Mobile responsiveness is achieved by conditionally rendering a table for desktop and cards for mobile.

39. Why `employeesQuery.data ?? []` is used everywhere
    - It keeps the UI safe while data is loading and avoids `undefined` checks in render logic.

40. Why `window.addEventListener(ATTENDANCE_CHANGED_EVENT...)` is used
    - The app dispatches a custom event when attendance state changes from other pages or actions.
    - This ensures the admin dashboard updates automatically without requiring a full page reload.

---

## 2. Backend Overview

The backend is a Spring Boot application using MongoDB as the database.

Admin-specific backend files are:

- `backend/src/main/java/attendance/example/backend/controller/EmployeeController.java`
- `backend/src/main/java/attendance/example/backend/controller/AuthController.java`
- `backend/src/main/java/attendance/example/backend/service/AuthService.java`
- `backend/src/main/java/attendance/example/backend/service/EmployeeService.java`
- `backend/src/main/java/attendance/example/backend/service/EmployeeDetailsImportService.java`
- `backend/src/main/java/attendance/example/backend/service/AuditService.java`
- `backend/src/main/java/attendance/example/backend/repository/EmployeeRepository.java`
- `backend/src/main/java/attendance/example/backend/repository/DeletionRequestRepository.java`
- `backend/src/main/java/attendance/example/backend/repository/AuditLogRepository.java`
- `backend/src/main/java/attendance/example/backend/model/Employee.java`
- `backend/src/main/java/attendance/example/backend/model/DeletionRequest.java`
- `backend/src/main/java/attendance/example/backend/model/AuditLog.java`

These components implement the REST API flow, admin authorization, business logic, and database access.

### 2.1 API Flow

#### Request lifecycle: frontend → backend

1. The admin UI triggers an API call from `frontend/src/lib/api.ts`.
2. The request is sent to a backend route such as `/api/employees/import-details` or `/api/employees/deletion-requests/{employeeId}/approve`.
3. Spring Boot routes the request to the appropriate controller method using annotations like `@PostMapping`.
4. The controller verifies authorization and delegates to services.
5. The service performs business logic and persists or queries MongoDB repositories.
6. The controller returns a `ResponseEntity` with data or status code.
7. The frontend receives the response, updates state, and re-renders.

This model follows the MVC pattern:
- Controller: handles HTTP layer and request mapping
- Service: contains business logic and validation
- Repository: performs MongoDB data access
- Model: represents domain entities

### 2.2 `backend/src/main/java/attendance/example/backend/controller/AuthController.java`

This controller handles authentication and session-related requests.

#### Line-by-line explanation

1. `package attendance.example.backend.controller;`
   - What: Declares the Java package.
   - Why: Organizes code and matches the folder structure.

2. `import attendance.example.backend.dto.*;`
   - What: Imports request and response DTO classes.
   - Why: Defines the shape of payload data.
   - Note: DTO stands for Data Transfer Object.

3. `import attendance.example.backend.model.Employee;`
   - What: Imports the employee entity type.
   - Why: The `/me` endpoint returns an employee object.

4. `import attendance.example.backend.service.AuthService;`
   - What: Imports the auth service.
   - Why: The controller delegates all auth work to service layer.

5. `import jakarta.servlet.http.HttpServletRequest;`
   - What: Represents the incoming HTTP request.
   - Why: Used to read the session cookie and request data.

6. `import jakarta.servlet.http.HttpServletResponse;`
   - What: Represents the HTTP response.
   - Why: Used to write cookies.

7. `import org.springframework.http.ResponseEntity;`
   - What: A Spring type for HTTP responses.
   - Why: Allows explicit status codes and payloads.

8. `import org.springframework.web.bind.annotation.*;`
   - What: Imports Spring MVC annotations.
   - Why: Maps HTTP methods and routes.

9. `@RestController`
   - What: Marks the class as a REST controller.
   - Why: Tells Spring to serialize return values as JSON.

10. `@RequestMapping("/api/auth")`
    - What: Base URL for all auth routes.
    - Why: Groups related endpoints under a common path.

11. `public class AuthController { ... }`
    - What: Defines the controller class.
    - Why: Handles auth-related HTTP requests.

12. `private final AuthService authService;`
    - What: Dependency on auth service.
    - Why: Keeps controller thin and delegates business rules.

13. `public AuthController(AuthService authService) { this.authService = authService; }`
    - What: Constructor-based dependency injection.
    - Why: Spring automatically provides the auth service bean.

14. `@PostMapping("/signup")`
    - What: Maps HTTP POST `/api/auth/signup`.
    - Why: Signup is a create operation.

15. `public ResponseEntity<AuthResponse> signup(@RequestBody SignupRequest request, HttpServletResponse response) throws Exception { return ResponseEntity.ok(authService.signup(request, response)); }`
    - What: Receives signup payload and returns auth response.
    - Why: Creates a new user and sets session cookie.

16. `@PostMapping("/login")`
    - What: Maps HTTP POST `/api/auth/login`.
    - Why: Login is a state-changing authentication operation.

17. `public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request, HttpServletResponse response) throws Exception { ... }`
    - What: Validates credentials via service, then returns current user and role.

18. `@GetMapping("/me")`
    - What: Maps HTTP GET `/api/auth/me`.
    - Why: Returns authenticated user details.

19. `public ResponseEntity<Employee> me(HttpServletRequest request) throws Exception { return ResponseEntity.ok(authService.getCurrentUser(request)); }`
    - What: Delegates to service to resolve session cookie and fetch user.

20. `@PutMapping("/me")`
    - What: Maps `PUT /api/auth/me`.
    - Why: Updates the user's profile.

21. `public ResponseEntity<Employee> updateProfile(@RequestBody ProfileUpdateRequest request, HttpServletRequest httpRequest) throws Exception { return ResponseEntity.ok(authService.updateProfile(httpRequest, request)); }`
    - What: Sends profile updates to service.

22. `@PutMapping("/password")`
    - What: Maps password change requests.
    - Why: Users can change passwords while signed in.

23. `public ResponseEntity<Void> changePassword(@RequestBody PasswordChangeRequest request, HttpServletRequest httpRequest) throws Exception { authService.changePassword(httpRequest, request); return ResponseEntity.noContent().build(); }`
    - What: Handles password change.
    - Why: Returns 204 No Content on success.

24. `@PostMapping("/check-email")`
    - What: Maps email existence check.
    - Why: Used for sign-up validation.

25. `public ResponseEntity<?> checkEmail(@RequestBody CheckEmailRequest request) throws Exception { boolean exists = authService.checkEmailExists(request); return ResponseEntity.ok(java.util.Map.of("exists", exists)); }`
    - What: Returns a JSON object with existence status.

26. `@PostMapping("/forgot-password-reset")`
    - What: Maps forgot password reset.
    - Why: Allows password reset flows.

27. `public ResponseEntity<Void> forgotPasswordReset(@RequestBody ForgotPasswordResetRequest request) throws Exception { authService.forgotPasswordReset(request); return ResponseEntity.noContent().build(); }`
    - What: Executes reset and returns 204.

28. `@PostMapping("/logout")`
    - What: Maps logout requests.
    - Why: Clears the session cookie on the server.

29. `public ResponseEntity<Void> logout(HttpServletResponse response) { authService.logout(response); return ResponseEntity.noContent().build(); }`
    - What: Delegates to service and returns 204.

### 2.3 `backend/src/main/java/attendance/example/backend/service/AuthService.java`

This service implements login, signup, session cookies, and user validation.

#### Important concepts

- Session management uses a secure cookie named `att_session_uid`.
- Admin authorization is determined at runtime by the employee document's `role` field.
- Passwords are hashed with PBKDF2 in `PasswordEncoder`.
- The backend maintains a consistent security model across login, current user resolution, logout, and password changes.

#### Line-by-line highlights

1. `@Service`
   - Marks the class as a Spring bean.
   - Why: Spring will manage lifecycle and injection.

2. `private static final String SESSION_COOKIE = "att_session_uid";`
   - Cookie name used for session tracking.
   - Why: The frontend uses this cookie when calling backend APIs.

3. `public AuthService(EmployeeService employeeService, NotificationService notificationService, @Value("${app.session.cookie-secure:false}") boolean sessionCookieSecure)`
   - Constructor injection.
   - `sessionCookieSecure` is configurable from `application.yml`.
   - Why: Allows the cookie to be secure in production.

4. `public AuthResponse signup(SignupRequest request, HttpServletResponse response) throws Exception { ... }`
   - Validates signup payload, ensures unique email/employeeId, hashes password, creates employee, writes cookie.
   - Why: Provides onboarding for new employees.
   - Output: `AuthResponse` containing employee object and role.

5. `public AuthResponse login(LoginRequest request, HttpServletResponse response) throws Exception { ... }`
   - Normalizes employee ID and validates password.
   - If employee status is `inactive`, login is rejected.
   - Writes session cookie when successful.

6. `public Employee getCurrentUser(HttpServletRequest request) throws Exception { ... }`
   - Reads session cookie and resolves employee.
   - Returns null if no session exists or user is inactive.

7. `public void logout(HttpServletResponse response) { ... }`
   - Clears the session cookie by setting max age 0.
   - Why: Ends the client session.

8. `public boolean checkEmailExists(CheckEmailRequest request) throws Exception { ... }`
   - Validates email format and checks the repository.
   - Why: Used for signup validation.

9. `public void forgotPasswordReset(ForgotPasswordResetRequest request) throws Exception { ... }`
   - Looks up employee by email and resets password.
   - Sends a notification after success.

10. `public void changePassword(HttpServletRequest request, PasswordChangeRequest payload) throws Exception { ... }`
    - Reads session employee id, validates current password, hashes new password.
    - Why: Ensures only the logged-in user can change their password.

11. `public Employee updateProfile(HttpServletRequest request, ProfileUpdateRequest payload) throws Exception { ... }`
    - Reads session employee id and updates profile through `EmployeeService`.

12. Helper methods:
    - `validateSignup(SignupRequest request)`: verifies required fields, employee id format, email domain, password strength.
    - `requirePassword(String password)`: ensures password complexity.
    - `requireText(String value, String message)`: non-empty validation.
    - `writeSessionCookie(HttpServletResponse response, String employeeUid)`: creates the auth cookie.
    - `readSessionCookie(HttpServletRequest request)`: reads session cookie from the request.

### 2.4 `backend/src/main/java/attendance/example/backend/controller/EmployeeController.java`

This controller contains admin-only endpoints and employee-related operations.

#### Responsibilities

- Return employee list
- Retrieve and create deletion requests
- Approve / dismiss deletion requests
- Import employee details from uploaded files
- Protect admin endpoints with explicit role verification

#### Line-by-line explanation

1. `@RestController`
   - Marks the class as a REST controller.

2. `@RequestMapping("/api/employees")`
   - Base URL for employee APIs.

3. `private final EmployeeService employeeService;`
   - Service for employee logic.

4. `private final EmployeeDetailsImportService employeeDetailsImportService;`
   - Service for parsing employee import files.

5. `private final AuditService auditService;`
   - Service for audit logging.

6. Constructor injection
   - Allows Spring to inject dependencies.

7. `@GetMapping`
   - Maps `GET /api/employees`.
   - Returns the full employee list.

8. `public ResponseEntity<List<Employee>> getEmployees() throws Exception { return ResponseEntity.ok(employeeService.getEmployees()); }`
   - Delegates to service and returns 200 OK.

9. `@GetMapping("/{employeeId}/deletion-request")`
   - Maps `GET /api/employees/{employeeId}/deletion-request`.
   - Fetches a single deletion request for the employee.

10. `public ResponseEntity<DeletionRequest> getDeletionRequest(@PathVariable String employeeId) throws Exception { ... }`
    - Uses `findDeletionRequestByEmployeeId` and throws 404 if not found.

11. `@PostMapping("/{employeeId}/deletion-request")`
    - Maps `POST /api/employees/{employeeId}/deletion-request`.
    - Creates a deletion request by the employee (not admin-only).

12. `@GetMapping("/deletion-requests")`
    - Maps `GET /api/employees/deletion-requests`.
    - Returns all pending assignment requests.

13. `@PostMapping(value = "/import-details", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)`
    - Maps file upload endpoint for employee details.
    - Consumes multipart form data.

14. `public ResponseEntity<Map<String, Object>> importEmployeeDetails(... HttpServletRequest request) throws Exception { ... }`
    - Verifies admin access.
    - If `preview` true, returns preview results.
    - Otherwise performs import and logs audit data.

15. `@PostMapping("/deletion-requests/{employeeId}/approve")`
    - Maps admin approval of deletion requests.

16. `public ResponseEntity<DeletionRequest> approveDeletionRequest(@PathVariable String employeeId, HttpServletRequest request) throws Exception { ... }`
    - Verifies admin access.
    - Approves the request via service.
    - Logs audit action.

17. `@PostMapping("/deletion-requests/{employeeId}/dismiss")`
    - Maps admin dismissal of deletion requests.

18. `public ResponseEntity<Void> dismissDeletionRequest(@PathVariable String employeeId, HttpServletRequest request) throws Exception { ... }`
    - Verifies admin access.
    - Dismisses the request and logs audit action.

19. `private Employee verifyAdminAccess(HttpServletRequest request) throws Exception { ... }`
    - Why: Performs role-based authorization manually inside controller.
    - Execution:
      - reads `att_session_uid` cookie from the request
      - fetches employee by internal MongoDB id using `employeeService.findById`
      - checks employee role equals `admin`
      - throws `ApiException(HttpStatus.FORBIDDEN, "Admin access required")` on failure
    - Purpose: Protects admin endpoints at the server.

20. `private String readSessionCookie(HttpServletRequest request) { ... }`
    - What: Helper to extract the session cookie.
    - Why: Admin verification relies on the same cookie used by login.

### 2.5 `backend/src/main/java/attendance/example/backend/service/EmployeeService.java`

This service is the core employee business layer.

#### Responsibilities

- Employee creation, update, and lookup
- Deletion request lifecycle
- Role resolution and sanitization
- Legacy and import compatibility
- Audit-friendly employee state handling

#### Key sections

1. `public List<Employee> getEmployees() throws Exception { ... }`
   - Retrieves all employees from MongoDB.
   - Sanitizes fields and sorts by full name.

2. `public Optional<Employee> findById(String id) throws Exception { ... }`
   - Finds by MongoDB document id.

3. `public Employee findByEmployeeId(String employeeId) throws Exception { ... }`
   - Finds by business employeeId.
   - Normalizes the ID to uppercase.

4. `public Employee createEmployee(String uid, SignupRequest request, String hashedPassword) throws Exception { ... }`
   - Creates a new employee record for signup.
   - Validates fields and sets defaults.
   - Resolves the role from the employeeId prefix.

5. `public void updatePassword(String employeeId, String hashedPassword) throws Exception { ... }`
   - Updates password for a given employee id.

6. `public Employee updateProfile(String employeeId, ProfileUpdateRequest request) throws Exception { ... }`
   - Updates user profile and validates unique email.

7. `public Employee requireEmployee(String idOrBusinessEmployeeId) throws Exception { ... }`
   - Resolves either MongoDB id or business employeeId.
   - Why: Supports APIs using both internal and external IDs.

8. `public String resolveInternalEmployeeId(String idOrBusinessEmployeeId) throws Exception { ... }`
   - Returns the canonical MongoDB internal id.

9. `public void ensureUniqueSignup(SignupRequest request) throws Exception { ... }`
   - Prevents duplicate signups by employeeId or email.

10. `public Optional<DeletionRequest> findDeletionRequestByEmployeeId(String employeeId) throws Exception { ... }`
    - Finds a deletion request record.

11. `public DeletionRequest createDeletionRequest(String employeeId) throws Exception { ... }`
    - Creates a new deletion request with status `pending`.
    - Also sends a notification to the employee.

12. `public List<DeletionRequest> getPendingDeletionRequests() throws Exception { ... }`
    - Returns all requests with status `pending`.

13. `public DeletionRequest approveDeletionRequest(String employeeId, String reviewerId) throws Exception { ... }`
    - Approves the request and marks the employee `inactive`.
    - Notifies the employee of approval.

14. `public void dismissDeletionRequest(String employeeId) throws Exception { ... }`
    - Dismisses the pending request and notifies employee.

15. `public ImportEmployeeResult upsertImportedEmployee(String email, String fullName, String roleText, String employeeId, String team) throws Exception { ... }`
    - Handles employee details import logic.
    - Resolves role from imported text or employeeId.
    - Creates or updates employee records with default values.

16. `public int provisionMissingPasswords() { ... }`
    - Adds default passwords to employees missing one.

17. `public String resolveEmployeeId(SignupRequest request) { ... }`
    - Normalizes and validates employee IDs.

18. `public String resolveRole(String employeeId) { ... }`
    - Uses prefix `admin` to determine admin role.
    - This is the same logic used by frontend auth.

19. `public Employee sanitize(Employee employee) { ... }`
    - Ensures employee object has default values and normalized text.
    - Why: Provides safe data back to APIs.

20. Internal helper methods
    - `isValidIndianState` verifies state names.
    - `normalizeEmployeeId` uppercases IDs.
    - `normalizeEmail` enforces `srmtech.com` domain.
    - `requireText` checks non-empty values.
    - `defaultIfBlank` returns fallback values.
    - `assignIfChanged` updates values only when changed.
    - `resolveImportedRole` chooses admin role if indicated.

### 2.6 `backend/src/main/java/attendance/example/backend/service/EmployeeDetailsImportService.java`

This service handles file parsing for imported employee details.

#### Why it exists

- Admins need to bulk import employee record updates.
- The import flow must support both CSV and Excel.
- Preview is required before committing changes.
- The service validates structure and captures a preview of bad rows.

#### Key concepts

- `MultipartFile`: Spring abstraction for uploaded files.
- `DataFormatter`, `WorkbookFactory`: Apache POI classes for Excel parsing.
- `ImportFormat`: internal enum to support two layout variants.
- `ParsedEmployeeSheet`: holds preview rows and errors.

#### Line-by-line highlights

1. `public Map<String, Object> previewEmployeeDetailsFile(MultipartFile file, Integer month, Integer year) throws Exception { ... }`
   - Parses the upload and returns mode `preview`.
   - Why: Frontend can inspect rows before import.

2. `public Map<String, Object> importEmployeeDetailsFile(MultipartFile file, Integer month, Integer year) throws Exception { ... }`
   - Parses the upload and then calls `employeeService.upsertImportedEmployee` for each valid row.
   - Tracks created, updated, and skipped employees.
   - Returns full result payload including errors.

3. `private ParsedEmployeeSheet parseEmployeeDetailsFile(MultipartFile file, Integer month, Integer year) throws Exception { ... }`
   - Validates file and dispatches to `parseCsv` or `parseWorkbook` based on extension.

4. `private ParsedEmployeeSheet parseCsv(MultipartFile file, Integer month, Integer year) throws Exception { ... }`
   - Reads CSV lines, detects format, identifies date columns, and validates rows.
   - Problem solved: Supports both comma and tab-delimited CSV and handles quoted values.

5. `private ParsedEmployeeSheet parseWorkbook(MultipartFile file, Integer month, Integer year) throws Exception { ... }`
   - Uses Apache POI to read Excel worksheets.
   - Builds a list of row values and reuses the same column mapping logic.

6. `private void mapColumns(List<String> columns, ImportFormat format, int sourceRowNumber, List<EmployeeImportRow> rows, List<String> errors) { ... }`
   - Converts raw row strings into `EmployeeImportRow` objects.
   - Validates required fields: employeeId, fullName, email.

7. `private List<Map<String, String>> buildPreviewRows(List<EmployeeImportRow> rows) { ... }`
   - Creates a shallow preview payload for the frontend.
   - Why: Limits preview size to the first 10 rows.

8. Header detection helpers (`looksLikeHeader`, `looksLikeSpreadsheetHeader`, `detectFormat`, `isHeaderRow`)
   - Determine whether the first row is a header row.
   - Why: Skips headers and prevents them from being imported as data.

9. `private String clean(String value) { ... }`
   - Normalizes text values.
   - Removes BOM, non-breaking spaces, control characters, and trims whitespace.
   - Why: Ensures consistent data from messy uploads.

10. `private Set<Integer> detectDateColumnsFromHeaders(...)` and `detectDateColumnsFromHeader(...)`
    - Identifies date columns in imported files when month/year is provided.
    - Why: Skips rows with no activity in the selected month.

11. `private List<String> parseLine(String line, char delimiter) { ... }`
    - Splits CSV rows safely, supporting quoted strings and escaped quotes.
    - Why: Prevents broken parsing for typical CSV edge cases.

12. `private enum ImportFormat { LEGACY, SPREADSHEET }`
    - Defines two supported import layouts.
    - Why: Allows the service to support both old and new upload formats.

13. `private record EmployeeImportRow(...)` and `ParsedEmployeeSheet(...)`
    - Immutable data containers introduced in Java 16.
    - Why: Simplifies data storage without boilerplate getters.

### 2.7 `backend/src/main/java/attendance/example/backend/service/AuditService.java`

This service logs admin actions.

#### Key points

- Audit logs are stored in the `audit_logs` collection.
- Each record captures admin identity, action type, description, target employee, timestamp, and IP address.
- Service is intentionally simple and writes logs asynchronously in a try/catch to avoid breaking main admin flows.

#### Explanation

1. `public void logAction(Employee admin, String action, String description, String targetEmployeeId, HttpServletRequest request) { ... }`
   - Builds an `AuditLog` object and saves it.
   - Extracts IP address from `X-Forwarded-For`, `X-Real-IP`, or `getRemoteAddr()`.
   - Why: Provides traceability for admin operations.

2. `private String extractIpAddress(HttpServletRequest request) { ... }`
   - Checks common proxy headers and falls back to remote address.
   - Why: Captures the client's origin for audit.

### 2.8 Repositories

Spring Data MongoDB repositories simplify database access with method name queries.

#### `EmployeeRepository`

- Extends `MongoRepository<Employee, String>`.
- Custom methods:
  - `Optional<Employee> findByEmployeeId(String employeeId);`
  - `Optional<Employee> findByEmail(String email);`
  - `List<Employee> findByEmployeeIdIn(List<String> employeeIds);`

Why this works:
- Spring Data auto-generates the query implementation based on method names.
- No explicit DAO code is necessary.

#### `DeletionRequestRepository`

- Extends `MongoRepository<DeletionRequest, String>`.
- Custom methods:
  - `Optional<DeletionRequest> findByEmployeeId(String employeeId);`
  - `List<DeletionRequest> findByStatus(String status);`

This supports deletion request retrieval and listing.

#### `AuditLogRepository`

- Extends `MongoRepository<AuditLog, String>`.
- Custom methods:
  - `List<AuditLog> findByAdminIdOrderByTimestampDesc(String adminId);`
  - `List<AuditLog> findAllByOrderByTimestampDesc();`

This supports audit history queries.

### 2.9 Models

#### `Employee` entity

This model is mapped to the `employees` MongoDB collection.

- `@Document("employees")`: tells Spring Data the collection name.
- `@Id`: designates the MongoDB document id.
- Fields include employeeId, fullName, designation, team, email, city, state, country, avatarColor, status, password, role.
- `@JsonIgnore` on password and role: prevents them from being serialized in API responses.
- `@Transient attendanceRecords`: not persisted; used optionally for in-memory aggregation.

Why each field exists:
- `employeeId`: business employee identifier shown to users.
- `fullName`, `designation`, `team`, `email`, `city/state/country`: profile fields.
- `avatarColor`: used for consistent user avatars.
- `status`: active/inactive state controlling login and visibility.
- `password`: hashed authentication secret.
- `role`: determines authorization.

#### `DeletionRequest` entity

This model is mapped to `employee_deletion_requests`.

- Fields include id, employeeId, status, requestedAt, requestedBy, reviewedBy, reviewedAt.
- It represents an employee lifecycle workflow where an employee requests account deletion and an admin approves or dismisses it.

#### `AuditLog` entity

Mapped to `audit_logs`.

- Fields include adminId, adminName, adminEmail, action, description, targetEmployeeId, timestamp, ipAddress.
- It records admin activity for compliance and troubleshooting.

---

## 3. End-to-End Execution Flow

### 3.1 Admin login and session management

1. Admin enters credentials on `frontend/src/pages/Login.tsx`.
2. The login form calls `frontend/src/lib/api.ts` → `loginUser(empId, password)`.
3. The browser sends `POST /api/auth/login` with credentials.
4. Spring Boot routes to `AuthController.login(...)`.
5. `AuthController` delegates to `AuthService.login(...)`.
6. `AuthService` normalizes employee ID and fetches the employee from `EmployeeService.findByEmployeeId(...)`.
7. If the employee exists and password validation succeeds, the service writes the session cookie `att_session_uid` and returns `AuthResponse(employee, role)`.
8. The frontend stores the response in local storage via `AuthProvider.login(...)`.
9. React Router navigates to the dashboard or allows the admin to access `/admin`.

Interview explanation:
- "The login flow uses a secure session cookie and role is derived from the employee record. Admin authorization is not based on a client-side flag alone; the backend re-checks the stored cookie and employee role on protected routes."

### 3.2 Accessing admin routes

1. The admin visits `/admin` or `/admin/monitor`.
2. `App.tsx` matches the route and wraps the component with `AdminProtectedRoute`.
3. `AdminProtectedRoute` calls `useAuth()`.
4. If auth is still initializing, it shows a loading screen.
5. If the user is not authenticated, it redirects to `/login`.
6. If the user is authenticated but not an admin, it redirects to `/dashboard`.
7. If the user is an admin, it renders `AdminShell` and the requested admin page.

Interview explanation:
- "This is an example of client-side RBAC. The UI prevents access and can redirect unauthorized users, but the backend also performs its own checks."

### 3.3 Admin dashboard flow

1. On `AdminDashboard`, React Query fetches all employees and attendance.
2. `useEmployees()` returns employee data from `/api/employees`.
3. `useAttendanceForEmployees(employeeIds, rangeFromKey, rangeToKey)` returns attendance records grouped by employee.
4. Derived state such as `stats`, `ranked`, and `officeMetrics` are computed with `useMemo`.
5. The admin can open import dialogs and upload files.
6. Upload functions call `frontend/src/lib/api.ts`:
   - `previewEmployeeDetails` sends file to `/api/employees/import-details?preview=true`
   - `importEmployeeDetails` sends file to `/api/employees/import-details`
   - `previewAttendanceImport` and `importAttendanceExcel` send files to `/api/attendance/import-excel`
7. After successful import, `refreshDashboardData()` refetches queries to update the page.
8. The page conditionally renders dialogs, tables, and cards based on state.

Interview explanation:
- "The admin dashboard uses an analytic-first approach: it fetches employee and attendance data once, computes multiple derived metrics, and renders them in cards, tables, and charts. Import workflows are guarded by preview before commit."

### 3.4 Admin monitor flow

1. `Monitor.tsx` loads all employees and pending deletion requests.
2. It also fetches attendance for the current month.
3. The page renders a searchable employee directory and a request queue.
4. When the admin approves or dismisses a request, the page calls `approveDeletionRequest` / `dismissDeletionRequest`.
5. Those API calls hit `/api/employees/deletion-requests/{employeeId}/approve` or `/dismiss`.
6. The backend controller verifies the caller's admin role via `verifyAdminAccess`.
7. If authorized, service methods update the deletion request status and employee state.
8. The frontend refreshes the request list and dispatches an event so other components can update.

Interview explanation:
- "The monitor page is the admin workflow center for account deletion approvals. Because requests are sensitive, approval and dismissal are performed through dedicated endpoints that require an admin session cookie."

### 3.5 Admin import flow

1. Admin clicks Import Employee Details or Import Excel.
2. Frontend uploads the file to the backend.
3. For employee details import:
   - `EmployeeDetailsImportService.parseEmployeeDetailsFile()` determines file type.
   - It supports CSV or Excel and detects headers.
   - It validates required fields and returns preview rows and errors.
   - For actual import, it iterates valid rows and calls `employeeService.upsertImportedEmployee(...)`.
4. For attendance import, the backend likely has a similar service in `AttendanceService` / `ExcelImportService`.

Interview explanation:
- "The import service is designed to support real-world file variability while still validating required fields and giving admins a preview of what will be imported."

### 3.6 Admin authorization

1. When backend receives an admin endpoint request, the controller uses the session cookie `att_session_uid`.
2. `EmployeeController.verifyAdminAccess` reads the cookie and resolves the employee record.
3. It checks `employee.getRole().equalsIgnoreCase("admin")`.
4. If the employee is not admin or cookie missing, it throws `ApiException(HttpStatus.FORBIDDEN, "Admin access required")`.
5. This is server-side enforcement and cannot be bypassed by the UI.

Interview explanation:
- "We use both client-side and server-side role checks. The frontend prevents users from seeing admin routes, but the backend also verifies each admin request before executing state-changing operations."

### 2.10 Authentication and security

#### Session management

- The backend writes a cookie named `att_session_uid` during login and signup.
- The cookie is `HttpOnly`, so JavaScript cannot read it directly.
- The `secure` attribute is configurable and should be enabled in production.
- The cookie path is `/`, so it is included on all app requests.

#### Password security

- Passwords are hashed using `PasswordEncoder.encode(...)` before storing in MongoDB.
- During login, `PasswordEncoder.matches(...)` validates the password.
- This prevents storing plain text passwords.

#### Role-based access

- Admin status is derived from `employee.role`.
- Legacy logic uses employee ID prefixes like `admin` to preserve old data.
- `EmployeeService.resolveRole` ensures admins are recognized if the employee ID begins with `admin`.

#### Why not JWT?

- This project uses session cookies instead of JWT.
- The implementation is simpler and the session cookie is managed by the backend.
- The important security element is that the cookie is HttpOnly and validated by the backend.

---

## 4. Admin Business Logic and Domain Context

### Why the admin module exists

In a company attendance tracker, admins need a dedicated console for tasks that normal employees cannot execute:

- Bulk importing employee master data and attendance
- Monitoring attendance patterns across the organization
- Approving or rejecting account deletion requests
- Generating reports and analytics
- Seeing audit trails of admin actions

The admin module exists to separate these high-privilege operations from the employee experience.

### Real company usage

A real company would use this module for:

- Onboarding new employees via CSV or Excel uploads
- Ensuring attendance data is complete and compliant
- Reviewing employees with low office attendance or fully remote work patterns
- Handling data removal requests while preserving audit records
- Providing managers and HR with dashboards and export tools

### Attendance management flow

1. Admin uploads attendance data.
2. The system validates and previews it.
3. Admin confirms import.
4. The backend writes attendance records to the database.
5. The dashboard refreshes to show updated metrics.

### Employee management flow

1. Admin imports employee details.
2. Records are created, updated, or skipped.
3. The system sanitizes employee data and maintains default values.
4. Notifications may be issued for account changes.

### Approval workflows

- Employee requests account deletion.
- The request is stored in `employee_deletion_requests`.
- Admin reviews pending requests on the monitor page.
- Admin can approve or dismiss.
- Approved requests mark the employee `inactive`.
- Dismissed requests remain as review history.

### Permission flow

- Normal employees can request deletion but cannot approve it.
- Admins have access to `/admin` and `/admin/monitor` via `AdminProtectedRoute`.
- The backend double-checks admin permissions for every sensitive endpoint.

### Reporting flow

- The monitor page and dashboard produce charts and analytics.
- Admins can export PDF/CSV employee reports.
- The report generator collects attendance records for a selected timeline and formats them for download.

---

## 5. Interview / Presentation Notes

### How to explain to technical leads

- "This app separates admin and user flows with both UI-level protected routes and backend authorization checks. Admin routes are wrapped in `AdminProtectedRoute`, while the backend controllers enforce admin status using session cookies." 
- "The frontend uses React Query for data fetching, optimizing caching and revalidation for the admin dashboard analytics." 
- "The backend follows a clean MVC pattern: controllers map routes, services contain business logic, repositories handle MongoDB access, and models define the domain." 

### Important technical keywords

- RBAC (Role-Based Access Control)
- client-side routing
- React Query
- session cookie
- `HttpOnly` cookie
- `ResponseEntity`
- Spring Boot `@RestController`
- `@PostMapping` / `@GetMapping`
- DTO (Data Transfer Object)
- `useMemo` / `useEffect`
- dependency injection
- audit logging
- Excel/CSV import parsing

### Common questions and smart answers

- Q: "How does the system prevent non-admin users from calling admin backend APIs?"
  - A: "The backend verifies the session cookie and employee role in `EmployeeController.verifyAdminAccess`. If a request is not from an admin, it returns 403. This is a second line of defense beyond the frontend route guard."

- Q: "Why use React Query on the frontend?"
  - A: "React Query centralizes data fetching, caching, and refetch logic. It avoids duplicated loading state and automatically keeps list and detail pages in sync after actions."

- Q: "How are imports validated?"
  - A: "Imports are parsed server-side with strict header detection and row validation. The admin can preview data before committing, and errors are returned in a structured result."

- Q: "How does the admin role get determined?"
  - A: "The role is stored in the employee document and is also derived from the employee ID prefix for backward compatibility. The frontend reads it from the login response, and the backend confirms it on each secure endpoint."

- Q: "What happens after an employee deletion request is approved?"
  - A: "The request status becomes `approved`, the employee is marked `inactive`, and a notification is created to inform the employee."

---

## 6. Glossary of important terms

- `async` / `await`: JavaScript syntax for working with promises in an asynchronous way.
- `const`: Declares a constant binding in JavaScript/TypeScript.
- `let`: Declares a mutable variable.
- `map`: Array method that transforms each value.
- `filter`: Array method that returns elements matching a condition.
- `Promise`: Represents an asynchronous operation that will complete in the future.
- `callback`: A function passed into another function to be invoked later.
- `DTO`: Data Transfer Object, a simple object used to transfer data between layers.
- `Entity`: A persisted model object stored in a database.
- `Repository`: Abstraction for data access, typically to a database.
- `Dependency Injection`: Inversion of control that supplies dependencies from outside rather than constructing them internally.
- `JWT`: JSON Web Token, a token-based authentication mechanism (not used here).
- `middleware`: Code that runs between request and response, often used for authentication or logging.
- `interceptor`: A component that intercepts HTTP requests or responses.
- `annotations`: Java code metadata used by Spring Boot, such as `@RestController`.
- `interfaces`: TypeScript or Java constructs that define the shape of data.
- `generics`: TypeScript or Java feature to write reusable types.
- `hooks`: React functions like `useState` and `useEffect` that let function components manage state and lifecycle.
- `APIs`: Application Programming Interfaces, the contract between frontend and backend.
- `lifecycle`: The predictable stages a component or request goes through.

---

## 7. Use this document during the walkthrough

- Walk through the frontend architecture first, then the backend.
- Explain the login flow, route protection, and admin page mechanics.
- Demonstrate the import preview functionality as a real example of safe admin operations.
- Show how the backend verifies admin access even if the frontend is bypassed.
- Mention the audit log as evidence of secure admin action tracking.

Good luck with your walkthrough. This file is intended as both a study guide and a script for explaining the admin-specific architecture and code.
