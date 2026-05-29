# API Architecture Overview

This project uses **Spring Boot REST API** on the backend and a **fetch-based API client** on the frontend.

---

## 1. Backend: Spring Boot REST API

**What it is:** A Java-based REST API framework built with Spring Boot.

**Key characteristics:**
- Follows the **REST** (Representational State Transfer) architectural style
- Uses HTTP methods (GET, POST, PUT, DELETE) as verbs
- Returns JSON data
- Stateless (each request contains all info needed)

**Controller structure:**
```
AuthController.java       →  /api/auth/*
AttendanceController.java →  /api/attendance/*
EmployeeController.java   →  /api/employees/*
NotificationController.java → /api/notifications/*
HomeController.java       →  / (health check)
```

**All endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/signup` | Register |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update profile |
| PUT | `/api/auth/password` | Change password |
| POST | `/api/auth/check-email` | Check email exists |
| POST | `/api/auth/forgot-password-reset` | Reset password |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/employees` | List all employees |
| POST | `/api/employees/import-details` | Import employees from Excel |
| GET | `/api/attendance/{employeeId}` | Get attendance for one employee |
| GET | `/api/attendance?employeeIds=...` | Get attendance for multiple employees |
| **GET** | **`/api/attendance/counts?employeeIds=...`** | **New: lightweight counts** |
| POST | `/api/attendance/{employeeId}` | Mark attendance |
| GET | `/api/attendance/monthly-details/...` | Monthly details by type |
| POST | `/api/attendance/import-excel` | Bulk import attendance |
| GET | `/api/notifications` | List notifications |
| GET | `/api/notifications/unread` | Unread notifications |
| PUT | `/api/notifications/{id}/read` | Mark notification read |
| PUT | `/api/notifications/read-all` | Mark all read |

---

## 2. Frontend API Client

**What it is:** A lightweight fetch-based API client in `frontend/src/lib/api.ts`.

**How it works:**
- All API calls go through a shared `request<T>()` function
- Uses the browser's native `fetch()` API (no Axios or other library needed)
- Automatically handles JSON parsing, error messages, and CORS credentials
- Base URL comes from `VITE_API_BASE_URL` env variable (empty for same-origin)

**Key functions:**
```typescript
request<T>(path, options)  →  Core function: calls fetch(), parses response, handles errors
loginUser(empId, password) →  POST /api/auth/login
getAttendance(empId)       →  GET /api/attendance/{id}
getAttendanceForEmployees()→  GET /api/attendance?employeeIds=...
getAttendanceCountsForEmployees() → GET /api/attendance/counts?employeeIds=...  (NEW)
```

---

## 3. Request Flow (Frontend → Backend)

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React/Vite)                                  │
│                                                         │
│  api.ts:                                                 │
│    getAttendanceCountsForEmployees(ids, from, to)        │
│      ↓                                                  │
│    request("/api/attendance/counts?employeeIds=...")     │
│      ↓                                                  │
│    fetch("/api/attendance/counts?employeeIds=...")       │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP GET
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Nginx (production) or Vite Dev Proxy (development)     │
│  Forwards /api/* to backend                             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Backend (Spring Boot)                                   │
│                                                         │
│  AttendanceController.java                               │
│    @GetMapping("/counts")                                │
│    getAttendanceCounts(employeeIds, from, to)            │
│      ↓                                                  │
│  AttendanceService.java                                  │
│    getAttendanceCountsForEmployees()                     │
│      ↓                                                  │
│  MongoDB Aggregation Pipeline                            │
│    db.attendance_records.aggregate([                     │
│      { $match: { employeeId: {...}, date: {...} } },     │
│      { $group: { _id: {employeeId, status}, count } }   │
│    ])                                                    │
│      ↓                                                  │
│  Returns: { "empId1": { "WFO": 5, "WFH": 3, ... } }    │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Not REST API or FastAPI

- **REST API** → ✅ Yes, this IS a REST API (uses HTTP methods, stateless, resource-based URLs)
- **FastAPI** → ❌ No, that's a Python framework. This project uses **Spring Boot** (Java)
- **GraphQL** → ❌ No
- **gRPC** → ❌ No
- **SOAP** → ❌ No

This is a **standard RESTful API** built with **Spring Boot**.