# SRM Attendance Tracker - Deployment Guide

## Quick Fix Summary

**The Issue**: Frontend was making API calls to itself instead of the backend.

**Root Cause**: 
- Environment variable mismatch: `VITE_API_URL` vs `VITE_API_BASE_URL`
- In production (Render), Nginx proxy wasn't properly configured

**What was fixed**:
1. ✅ Updated `docker-compose.yml` to use correct env var name `VITE_API_BASE_URL`
2. ✅ Enhanced `nginx.conf` with proper proxy headers
3. ✅ Created `.env` file for local development

---

## Local Development Setup

### Using Docker Compose (Recommended)

```bash
docker-compose up --build
```

This will:
- Start backend on `http://localhost:9090` (inside container)
- Start frontend on `http://localhost:5173` (inside container)
- Backend is exposed to host on port `9090`
- Frontend is exposed to host on port `5173`

**Access the app**: http://localhost:5173

### Running Locally Without Docker

**Backend**:
```bash
cd backend
mvn spring-boot:run
```
Runs on: `http://localhost:8080` (or set `--server.port=9090`)

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

Make sure `frontend/.env` has:
```
VITE_API_BASE_URL=http://localhost:9090
```

---

## Production Deployment on Render

### Architecture

- **Single Docker container** runs:
  - Nginx (port 8080) - serves React frontend + proxies API requests
  - Spring Boot (port 8081) - backend API

- **API Routing**:
  - Frontend makes requests to `/api/*` (relative URLs)
  - Nginx intercepts these and proxies to `http://127.0.0.1:8081`
  - No hardcoded URLs needed - seamless integration

### Required Environment Variables on Render

When deploying on Render, set these in your Blueprint/Service env vars:

1. **FIREBASE_SERVICE_ACCOUNT_JSON** - Your Firebase service account key (JSON as single line)
2. **FIREBASE_WEB_API_KEY** - Your Firebase Web API key
3. **PORT** - Should be `8080` (default)
4. **SPRING_PROFILES_ACTIVE** - Set to `prod`

### How to Deploy to Render

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **"New +"** → **"Blueprint"**
4. Select your GitHub repo (containing this `render.yaml`)
5. Render auto-detects `render.yaml`
6. Fill in **FIREBASE_SERVICE_ACCOUNT_JSON** and **FIREBASE_WEB_API_KEY**
7. Click **"Apply"**
8. Render builds and deploys

### Verify Deployment Works

Once deployed to Render (e.g., https://your-app-1-xxxx.onrender.com):

1. Open https://your-app-1-xxxx.onrender.com/login
2. Check browser DevTools → Network tab
3. Try to login - API calls should show as `/api/auth/login`
4. Response status should be **200**, not **404**

---

## Common Issues & Solutions

### Issue: 404 on `/api/auth/login`

**Symptoms**: 
```
POST http://localhost:5173/api/auth/login → 404
```

**Solutions**:
1. Check `frontend/.env` has `VITE_API_BASE_URL=http://localhost:9090`
2. Run `npm run dev` in frontend directory (not `npm run build`)
3. Restart frontend dev server after changing `.env`
4. Or use Docker Compose: `docker-compose up --build`

### Issue: Backend returns 502 Bad Gateway

**Symptoms**: 
```
502 Bad Gateway from Nginx
```

**Solutions**:
1. Ensure backend is running on port 8081 (in Docker)
2. Check `start.sh` waits for Spring Boot to initialize
3. View logs: `docker logs <container-id>`
4. Increase `MAX_RETRIES` in `start.sh` if backend is slow

### Issue: CORS errors on Render

**Symptoms**:
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions**:
1. CORS should work automatically since Nginx proxies to same origin
2. Check `nginx.conf` has proper proxy headers
3. Verify backend CORS config in `application.properties`

---

## File Structure

```
.
├── frontend/
│   ├── .env                    # ← Local dev environment variables
│   ├── src/lib/api.ts          # Uses VITE_API_BASE_URL
│   └── ...
├── backend/
│   ├── src/...
│   └── Dockerfile
├── docker-compose.yml          # Local development setup
├── Dockerfile                  # Production single-container build
├── nginx.conf                  # Serves frontend + proxies /api/*
├── start.sh                    # Orchestrates Nginx + Spring Boot
├── render.yaml                 # Render Blueprint for deployment
└── DEPLOYMENT_GUIDE.md        # This file
```

---

## Technical Details

### How API Requests Work

**Local (Docker Compose)**:
1. Frontend (5173) sets `VITE_API_BASE_URL=http://localhost:9090`
2. API call: `http://localhost:9090/api/auth/login`
3. Backend receives on port 9090

**Production (Render)**:
1. Frontend built with `VITE_API_BASE_URL=""` (empty = use relative URLs)
2. Frontend makes: `/api/auth/login`
3. Nginx intercepts and proxies to: `http://127.0.0.1:8081/api/auth/login`
4. Spring Boot on 8081 receives request
5. Response goes through Nginx back to frontend

This architecture means:
- ✅ No hardcoded production URLs in code
- ✅ Works seamlessly whether single-container or multi-container
- ✅ Nginx handles all routing

---

## Need Help?

Check:
1. `frontend/.env` - Is it set correctly for your environment?
2. Backend logs - Is Spring Boot starting successfully?
3. `docker-compose logs backend` - Any startup errors?
4. Nginx logs - `docker-compose logs frontend`
5. Browser DevTools → Network tab - What's the actual request URL?
