# SRM Attendance System

## Overview

The SRM Attendance System is a modern, web-based application designed for tracking and managing employee attendance in hybrid work environments. It allows employees to mark their work modes (Work From Office - WFO, Work From Home - WFH, Client Location - CLT, Paid Time Off - PTO) daily, view analytics, and manage profiles. Administrators can monitor overall attendance, generate reports, and access employee details.

The system supports role-based access with two user types:
- **Employees (User Role)**: Can mark/update attendance, view personal dashboard and timesheets, edit profiles, and change passwords.
- **Administrators (Admin Role)**: Have access to employee monitoring, leaderboard, full attendance reports, and summary statistics.

Key features include real-time attendance marking, calendar-based views, data analytics with charts, exportable reports, and a responsive UI optimized for desktop and mobile devices.

## Features

### Frontend (React + TypeScript + Vite)

#### 1. Index Page
- **Purpose**: Entry point that redirects users based on authentication and role.
- **Functionality**: Checks if user is logged in; redirects to login if not, or to dashboard/admin based on role.
- **Details**: No UI elements; purely navigational.

#### 2. Login Page
- **Purpose**: User authentication.
- **Functionality**:
  - Email/Employee ID and password input.
  - Submit button triggers login API call.
  - Forgot password button (demo toast).
  - Link to signup page.
- **UI Details**: Brand section with logo and description, form with validation, responsive design.
- **Special Note**: For demo, entering "admin" in Employee ID logs in as admin.

#### 3. Signup Page
- **Purpose**: New user registration.
- **Functionality**:
  - Form fields: Full Name, Employee ID, Designation, Team, Email, Phone, City, State, Country, Pincode, Password, Confirm Password.
  - Designation dropdown with predefined options.
  - Country code selector for phone.
  - Validation: Required fields, password match, unique Employee ID/Email.
  - Submit creates account and logs in.
- **UI Details**: Hero section, card-based form with hints, responsive grid layout.

#### 4. Dashboard Page (Employee)
- **Purpose**: Personal attendance overview and daily marking.
- **Functionality**:
  - Greeting with current time.
  - Monthly overview stats: WFO, WFH, CLT, PTO counts, and "Not Marked" for current month.
  - Mark Attendance dialog: Select work mode (WFO/WFH/CLT/PTO), confirm to mark for today.
  - Attendance Calendar: Interactive calendar showing marked statuses, click to update past dates.
  - Weekly Summary: Bar chart of weekly WFO/WFH counts.
  - Streak Badges: Based on consecutive office days and total WFH.
- **UI Details**: Gradient hero card, stat cards, calendar component, charts using Recharts.

#### 5. Timesheets Page (Employee)
- **Purpose**: Detailed attendance history and analytics.
- **Functionality**:
  - Date range picker for filtering records.
  - Summary cards: Counts for WFO, WFH, CLT, PTO in selected range.
  - Daily Breakdown chart: Stacked bar chart of daily counts.
  - Distribution pie chart: Share of work modes.
  - Attendance History table: Date, Day, Status, Time Marked, sortable by date descending.
  - Export button: Generates CSV of filtered records (client-side).
- **UI Details**: Date picker, grid of stat cards, charts, scrollable table.

#### 6. Profile Page (Employee)
- **Purpose**: User profile management.
- **Functionality**:
  - Avatar upload (demo, shows preview).
  - Editable fields: Team, Email, Phone, City (others read-only like Employee ID, Designation).
  - Change Password dialog: Current, new, confirm passwords with validation.
  - Logout button: Logs out and redirects to login.
  - Delete Account button (demo toast for admin approval).
- **UI Details**: Hero card with avatar, grid of detail cards, dialogs for password change and delete.

#### 7. AdminDashboard Page (Admin)
- **Purpose**: Administrative overview of attendance.
- **Functionality**:
  - Today's summary: Total employees, marked today, not marked.
  - Stacked trend chart: Daily attendance over selected range.
  - Leaderboard table: Top 10 employees sorted by WFO ↓, CLT ↓, WFH ↓, PTO ↑, with WFO/CLT/WFH/PTO counts.
  - Insights cards: Top 5 WFO+CLT, ≥12 office days, <4 office days, fully remote employees.
  - Export buttons: Top Performers CSV, Full Report CSV.
- **UI Details**: Stat cards, chart, table, insight cards.

#### 8. Monitor Page (Admin)
- **Purpose**: Detailed employee monitoring.
- **Functionality**:
  - Search bar: Filter by name, Employee ID, team.
  - Employee cards: Avatar, name, designation, team, monthly counts for WFO/WFH/CLT/PTO.
  - Click card to view details: Profile info, charts (last 6 months bar, this month pie), attendance table.
  - Export buttons: Individual PDF, Monthly Report PDF (demo toasts).
- **UI Details**: Search input, grid of cards, detailed view with charts and table.

#### 9. NotFound Page
- **Purpose**: 404 error page.
- **Functionality**: Displays error message with link to home.
- **UI Details**: Centered text on muted background.

### Backend (Spring Boot + JWT)

#### Authentication & Authorization
- Cookie-based session auth.
- Roles: USER and ADMIN.
- Password hashing with PBKDF2.
- MongoDB Atlas-backed employee records.

#### API Endpoints
- **Auth**:
  - POST /auth/login: Login with Employee ID and password.
  - POST /auth/signup: Register new user.
- **Attendance**:
  - POST /attendance/mark: Mark today's attendance.
  - PUT /attendance/update: Update attendance for a date.
  - GET /attendance/user?start=&end=: Get records in date range.
  - GET /attendance/user/all: Get all user records.
  - GET /attendance/user/monthly?year=&month=: Monthly counts.
- **Employee**:
  - GET /employee/profile: Get user profile.
  - PUT /employee/profile: Update profile.
  - PUT /employee/password: Change password.
- **Admin**:
  - GET /admin/employees: List all employees.
  - GET /admin/summary?date=: Today's attendance summary.
  - GET /admin/leaderboard?start=&end=: Leaderboard data.
  - GET /admin/report?start=&end=: Full report data.

#### Data Storage
- MongoDB Atlas (`attendance_tracker`) via Spring Data MongoDB.
- Employee, attendance, notification, and deletion-request data persist in Atlas.

#### Security
- CORS enabled for configured frontend origins.
- HTTP-only session cookie for authenticated sessions.
- Password validation and PBKDF2 hashing.

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom variables
- **Charts**: Recharts
- **Icons**: Lucide React
- **State Management**: React hooks (no external library)
- **Routing**: React Router DOM
- **Forms**: Native inputs with validation
- **UI Components**: Shadcn/ui (based on Radix UI)
- **Date Handling**: date-fns

### Backend
- **Framework**: Spring Boot 3.2.0 with Java 17
- **Security**: Spring Security with JWT
- **Web**: Spring Web (REST APIs)
- **Validation**: Bean Validation
- **Storage**: In-memory (ConcurrentHashMap)
- **Build Tool**: Maven

## Prerequisites

- **Node.js**: Version 18 or higher (for frontend)
- **Java**: JDK 17 (for backend)
- **Maven**: 3.8+ (for backend build)
- **Git**: For cloning the repository

## Installation and Setup

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd srm_attendance
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   ```

3. **Backend Setup**:
   ```bash
   cd ../backend
   # No additional setup needed, Maven will download dependencies
   ```

## Running the Application

1. **Start the Backend**:
   ```bash
   cd backend
   ./run-local.ps1
   ```
   - Backend runs on http://localhost:8080
   - API available at http://localhost:8080/api/*

2. **Start the Frontend** (in a new terminal):
   ```bash
   cd frontend
   npm run dev
   ```
   - Frontend runs on http://localhost:5173
   - Open in browser to access the application

3. **Access the Application**:
   - Visit http://localhost:5173
   - Admin login defaults to `Admin323` / `Admin@srmtech25`
   - Sign up new users or log in with existing accounts

## API Documentation

The backend provides RESTful APIs. Key endpoints are listed above. Use tools like Postman for testing.

Example:
- Login: POST http://localhost:8080/api/auth/login with JSON body {"empId": "I1234", "password": "Welcome@123"}

## Database

This project is configured for MongoDB Atlas only. Do not point it at localhost MongoDB. Set `MONGODB_URI` in the project root `.env` for local runs and in Render environment variables for deployment.

## Future Enhancements

- Persistent database integration
- Real PDF/CSV export functionality
- Email notifications (e.g., forgot password)
- Advanced analytics and reporting
- Mobile app version

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request

## License

This project is licensed under the MIT License.
