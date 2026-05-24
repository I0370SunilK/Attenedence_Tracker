# SRM Attendance Tracker Quick Start

## Atlas Only

This project uses MongoDB Atlas only.

- Do not use local MongoDB.
- Set `MONGODB_URI` to the Atlas cluster URI for `attendance_tracker`.
- The sample format is in `.env.example`.

## Localhost

1. Copy `.env.example` to `.env` in the project root.
2. Update `MONGODB_URI` with the real Atlas password.
3. Start the backend:

```powershell
cd backend
.\run-local.ps1
```

4. Start the frontend in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

5. Open `http://localhost:5173`.

Notes:

- The backend runs on `http://localhost:8080`.
- Vite proxies `/api/*` to that backend automatically.
- Admin login defaults to `Admin323` / `Admin@srmtech25` unless overridden in env.
- Imported employees without a stored password are automatically provisioned with `EMPLOYEE_DEFAULT_PASSWORD` or `Welcome@123`.

## Render

Set these environment variables in Render:

- `MONGODB_URI`
- `ADMIN_EMPLOYEE_ID`
- `ADMIN_PASSWORD`
- `ADMIN_RECOVERY_EMAIL`
- `EMPLOYEE_DEFAULT_PASSWORD`
- `APP_CORS_ALLOWED_ORIGINS=https://attenedence-tracker.onrender.com`
- `SESSION_COOKIE_SECURE=true`

Deploy using the repo `render.yaml`.

## Common Checks

- `GET /health` should return `status: UP`
- `GET /backend` should return `Backend Running Successfully`
- If employee login fails, verify the exact `employeeId` in Atlas and try the default imported password if that user was created by import
