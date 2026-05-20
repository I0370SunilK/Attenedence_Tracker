# MongoDB Migration Complete ✅

## Overview
The Attendance Tracker application has been successfully migrated from **Firebase Authentication** to **MongoDB with Local Password Hashing**.

### Key Changes Made:
1. ✅ Removed all Firebase Admin SDK dependencies
2. ✅ Implemented PBKDF2 password hashing using `PasswordEncoder` utility
3. ✅ Configured MongoDB for all data persistence
4. ✅ Updated all authentication logic to use local password verification
5. ✅ Removed Firebase-specific exception handlers
6. ✅ All data now stored exclusively in MongoDB

---

## MongoDB Setup & Configuration

### Prerequisites
- MongoDB 4.4 or higher installed and running
- MongoDB accessible at `mongodb://localhost:27017` (default)

### Configuration Files

#### 1. **application.properties** 
Located at: `backend/src/main/resources/application.properties`

**Key MongoDB Settings:**
```properties
# MongoDB Connection
spring.data.mongodb.uri=mongodb://localhost:27017/attendance_tracker
spring.data.mongodb.database=attendance_tracker
spring.data.mongodb.auto-index-creation=true

# Server Configuration
server.port=8080
server.servlet.context-path=/api
```

**How to Configure for Different Environments:**

For **Local Development:**
```properties
spring.data.mongodb.uri=mongodb://localhost:27017/attendance_tracker
```

For **Production (Atlas):**
```properties
spring.data.mongodb.uri=mongodb+srv://username:password@cluster.mongodb.net/attendance_tracker
```

For **Docker:**
```properties
spring.data.mongodb.uri=mongodb://mongo:27017/attendance_tracker
```

---

## MongoDB Collections & Schema

### 1. **employees** Collection
Stores all employee data with passwords

**Document Structure:**
```json
{
  "_id": "uuid-string",
  "employeeId": "I0001",
  "fullName": "John Doe",
  "email": "john.doe@srmtech.com",
  "password": "hashed_password_with_salt",
  "designation": "Senior Developer",
  "team": "Backend",
  "city": "Bangalore",
  "state": "Karnataka",
  "country": "India",
  "avatarColor": "#FF5733",
  "status": "active",
  "role": "user"
}
```

**Indexes Created:**
- `employeeId` (unique)
- `email` (unique)
- `status`

### 2. **attendance_records** Collection
Stores attendance records for each employee

**Document Structure:**
```json
{
  "_id": "uuid-string",
  "employeeId": "I0001",
  "date": "2024-01-15",
  "status": "WFO",
  "markedAt": "2024-01-15T09:30:00Z",
  "edited": false
}
```

**Indexes Created:**
- `employeeId`
- `date`
- `employeeId + date` (compound)

### 3. **notifications** Collection
Stores user notifications

**Document Structure:**
```json
{
  "_id": "uuid-string",
  "employeeId": "I0001",
  "type": "info",
  "title": "Password Changed",
  "message": "Your password was successfully updated",
  "createdAt": "2024-01-15T10:00:00Z",
  "read": false,
  "actionLabel": "View Profile",
  "actionRoute": "/profile"
}
```

### 4. **employee_deletion_requests** Collection
Stores account deletion requests

**Document Structure:**
```json
{
  "_id": "I0001",
  "employeeId": "I0001",
  "status": "pending",
  "requestedAt": "2024-01-15T11:00:00Z",
  "requestedBy": "I0001",
  "reviewedBy": "hardcoded-admin",
  "reviewedAt": "2024-01-16T09:00:00Z"
}
```

---

## Authentication & Password Management

### Password Hashing
The application uses **PBKDF2** (Password-Based Key Derivation Function 2) for secure password hashing.

**Key Features:**
- 10,000 iterations
- 256-bit derived key
- 16-byte random salt per password
- Base64 encoding for storage

### Utility Class: `PasswordEncoder`
Location: `backend/src/main/java/attendance/example/backend/util/PasswordEncoder.java`

**Usage:**
```java
// Encoding a password (during signup)
String plainPassword = "MyPassword123!";
String hashedPassword = PasswordEncoder.encode(plainPassword);

// Verifying a password (during login)
boolean isCorrect = PasswordEncoder.matches(plainPassword, hashedPassword);
```

### Authentication Flow

#### Signup Flow:
1. User submits registration form
2. `AuthService.signup()` validates input
3. Password is hashed using `PasswordEncoder.encode()`
4. Employee document created in MongoDB with hashed password
5. Session cookie issued

#### Login Flow:
1. User enters Employee ID and password
2. `AuthService.login()` finds employee by ID in MongoDB
3. Password verified using `PasswordEncoder.matches()`
4. If match: session cookie issued
5. If no match: Unauthorized error returned

#### Password Reset/Change Flow:
1. User requests password reset or change
2. Current password verified (for change)
3. New password hashed using `PasswordEncoder.encode()`
4. Employee document updated in MongoDB
5. Notification created

---

## Starting the Backend

### Option 1: Maven (Recommended)
```bash
cd backend
mvn clean install
mvn spring-boot:run
```

### Option 2: Java JAR
```bash
cd backend
mvn clean package
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

### Option 3: Docker
```bash
docker-compose up -d
```

### Verify Server is Running
- **API Endpoint:** http://localhost:8080/api
- **Health Check:** http://localhost:8080/api/health (if configured)

---

## Troubleshooting

### Issue: Connection Refused to MongoDB
**Error:** `MongoDB connection refused at localhost:27017`

**Solution:**
1. Verify MongoDB is running: `mongosh`
2. Check connection URI in `application.properties`
3. For Docker: Ensure mongo service is running in docker-compose

### Issue: Password Hash Mismatch on Login
**Error:** "Invalid employee ID or password"

**Solution:**
- Passwords stored before migration won't match new hash format
- All existing users should reset passwords through "Forgot Password"
- OR manually hash old passwords before migration

### Issue: Employee Not Found During Signup
**Error:** "Employee ID already exists" or "Email already exists"

**Solution:**
- Check MongoDB collections for duplicates:
  ```bash
  db.employees.find({employeeId: "I0001"})
  ```
- Clear duplicate records if needed:
  ```bash
  db.employees.deleteMany({employeeId: "I0001"})
  ```

### Issue: Data Not Persisting
**Error:** "Data created but disappears after restart"

**Solution:**
1. Verify MongoDB is using persistent storage
2. Check `spring.data.mongodb.uri` points to correct database
3. Check MongoDB logs: `mongod --logpath mongo.log`

---

## Database Initialization

### Automatic Index Creation
Indexes are automatically created by Spring Data MongoDB on application startup because:
```properties
spring.data.mongodb.auto-index-creation=true
```

### Manual Index Creation (if needed)
```bash
# Connect to MongoDB
mongosh

# Use the database
use attendance_tracker

# Create indexes
db.employees.createIndex({ employeeId: 1 }, { unique: true })
db.employees.createIndex({ email: 1 }, { unique: true })
db.employees.createIndex({ status: 1 })

db.attendance_records.createIndex({ employeeId: 1 })
db.attendance_records.createIndex({ date: 1 })
db.attendance_records.createIndex({ employeeId: 1, date: 1 })
```

---

## Environment Variables (Optional)

For production deployments, set these environment variables instead of modifying `application.properties`:

```bash
# MongoDB Connection
export SPRING_DATA_MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/attendance_tracker

# Server Configuration
export SERVER_PORT=8080
export SERVER_SERVLET_CONTEXT_PATH=/api

# Admin Credentials
export APP_ADMIN_EMPLOYEE_ID=Admin323
export APP_ADMIN_PASSWORD=Admin@srmap

# CORS
export APP_CORS_ALLOWED_ORIGINS=http://localhost:5173
```

---

## Migration Checklist

Before deploying to production:

- [ ] MongoDB server is running and accessible
- [ ] `application.properties` configured correctly
- [ ] Backend compiles without errors: `mvn clean compile`
- [ ] All employees have reset their passwords
- [ ] Test signup with new account
- [ ] Test login with credentials
- [ ] Test password change functionality
- [ ] Test attendance tracking
- [ ] Verify data persists after server restart
- [ ] Verify all notifications work
- [ ] Test admin functions
- [ ] Verify CORS settings for frontend

---

## Data Backup & Recovery

### Backup MongoDB
```bash
# Using mongodump
mongodump --uri="mongodb://localhost:27017/attendance_tracker" --out=backup_folder

# Using Docker
docker exec mongodb mongodump --db attendance_tracker --archive > backup.archive
```

### Restore MongoDB
```bash
# Using mongorestore
mongorestore --uri="mongodb://localhost:27017" backup_folder

# Using Docker
docker exec mongodb mongorestore --archive < backup.archive
```

---

## Performance Optimization

### Indexes Summary
- **employees.employeeId:** Speeds up employee lookup
- **employees.email:** Enables email-based searches
- **attendance_records.employeeId:** Filters attendance by employee
- **attendance_records.date:** Filters attendance by date range
- **attendance_records (employeeId + date):** Optimizes combined queries

### Query Optimization Tips
- Always filter by indexed fields when possible
- Use date ranges instead of full scans
- Limit result sets for pagination
- Use projection to fetch only needed fields

---

## API Endpoints (Unchanged)

All REST API endpoints work the same way. Authentication is via session cookies.

**Example: Signup**
```bash
POST /api/auth/signup
Content-Type: application/json

{
  "fullName": "John Doe",
  "employeeId": "I0001",
  "email": "john.doe@srmtech.com",
  "password": "SecurePass123!",
  "designation": "Developer",
  "team": "Backend",
  "city": "Bangalore",
  "state": "Karnataka"
}
```

**Example: Login**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "empId": "I0001",
  "password": "SecurePass123!"
}
```

---

## Next Steps

1. **Backup existing data** if migrating from Firebase
2. **Configure MongoDB** connection in `application.properties`
3. **Test signup & login** with MongoDB
4. **Verify all features** work correctly
5. **Deploy frontend** pointing to new backend
6. **Monitor logs** for any issues

---

## Support

For issues or questions about MongoDB setup:
- Check MongoDB logs: `cat mongod.log`
- Check Spring Boot logs: Check console output
- Verify collection structure: `db.employees.findOne()`
- Test connection: `mongosh --eval "db.version()"`

---

**Last Updated:** January 2024  
**Firebase Migration Status:** ✅ Complete  
**MongoDB Status:** ✅ Operational  
**Backend Compilation:** ✅ Successful
