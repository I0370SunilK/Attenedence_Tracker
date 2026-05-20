# ============================================
# SRM Attendance Tracker - Multi-stage Docker Build
# Optimized for Render deployment
# Frontend (React + Vite) → Backend (Spring Boot) → Nginx (reverse proxy)
# ============================================

# ---- Stage 1: Build Frontend (React + Vite) ----
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm ci --include=dev --no-audit --no-fund

# Copy source code
COPY frontend/ .

# Set API base URL for production (empty = relative URLs through Nginx proxy)
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build frontend
RUN npm run build && echo "✓ Frontend build successful"

# Verify build output
RUN test -d dist || (echo "ERROR: Frontend dist/ directory not created" && exit 1)

# ---- Stage 2: Build Backend (Spring Boot + Maven) ----
FROM eclipse-temurin:17-jdk-alpine AS backend-builder

WORKDIR /app

# Install Maven
RUN apk add --no-cache maven

# Copy POM and download dependencies (layer caching optimization)
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B -DskipTests || true

# Copy source code
COPY backend/src ./src
COPY --from=frontend-builder /app/dist ./src/main/resources/static

# Build JAR (skip tests for faster builds)
RUN mvn clean package -DskipTests -B -q && echo "✓ Backend build successful"

# Verify JAR was created
RUN test -f target/*.jar || (echo "ERROR: Backend JAR not created" && exit 1)

# ---- Stage 3: Runtime (Nginx + JRE) ----
FROM nginx:1.27-alpine

# Install runtime dependencies: JRE for Spring Boot, gettext for envsubst, curl for health checks
RUN apk add --no-cache \
    openjdk17-jre-headless \
    gettext \
    curl \
    && echo "✓ Runtime dependencies installed"

WORKDIR /app

# Copy frontend built assets into Nginx web root
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Verify frontend files were copied
RUN ls -la /usr/share/nginx/html/ && test -f /usr/share/nginx/html/index.html || (echo "ERROR: Frontend index.html not found" && exit 1)

# Copy backend JAR
COPY --from=backend-builder /app/target/*.jar app.jar

# Copy Nginx configuration template
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh && echo "✓ Startup script configured"

# Expose port (Render will assign via PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/ || exit 1

# Run startup script
CMD ["/app/start.sh"]
