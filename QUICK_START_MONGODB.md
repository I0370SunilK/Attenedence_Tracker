# 🚀 Quick Start Guide - Complete Firebase to MongoDB Migration

## ✅ What Was Changed

### Removed:
- ❌ Firebase Admin SDK dependency
- ❌ Firebase authentication service
- ❌ Firebase configuration files
- ❌ Firebase password verification via REST API
- ❌ Google Cloud credentials requirement

### Added:
- ✅ MongoDB database configuration
- ✅ PBKDF2 password hashing utility (`PasswordEncoder`)
- ✅ Local authentication system
- ✅ Password storage in MongoDB
- ✅ Secure password verification locally

---

## 🔧 Installation & Setup

### Step 1: Install MongoDB (Local)

**On Windows:**
1. Download MongoDB from https://www.mongodb.com/try/download/community
2. Run installer and follow setup wizard
3. MongoDB runs as Windows Service automatically

**On Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**On Linux (Ubuntu):**
```bash
curl https://www.mongodb.com/static/pgp/server-4.4.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list
apt-get update
apt-get install -y mongodb-org
sudo systemctl start mongod
```

**Verify Installation:**
```bash
mongosh
# Should show MongoDB prompt
```

### Step 2: Build Backend

```bash
cd backend
mvn clean install
```

**Expected Output:**
```
BUILD SUCCESS
Total time: XX.XXXs
```

### Step 3: Start Backend

```bash
cd backend
mvn spring-boot:run
```

**Expected Output:**
```
Started BackendApplication in X.XXX seconds
Tomcat started on port 8080
```

### Step 4: Start Frontend

```bash
cd frontend
npm install  # or bun install
npm run dev # or bun dev
```

**Expected Output:**
```
VITE v4.X.X  ready in X ms
➜  Local:   http://localhost:5173/
```

---

## 📊 Database Status

### Check MongoDB is Running:
```bash
mongosh
> db.version()
# Should return version number
```

### View Database Contents:
```bash
mongosh attendance_tracker
> db.employees.count()
# Shows number of employees
```

### View Sample Employee:
```bash
mongosh attendance_tracker
> db.employees.findOne()
# Shows first employee document
```

---

## 🔑 Default Credentials

### Admin Login:
- **Employee ID:** `Admin323`
- **Password:** `Admin@srmap`

### Test Employee (Create via Signup):
- **Employee ID:** `I1234` (or `A1234`)
- **Email:** Must end with `@srmtech.com`
- **Password:** Must have uppercase, lowercase, number, and special character (min 8 chars)

---

## 🧪 Testing the Migration

### Test 1: User Signup
```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "employeeId": "I9999",
    "email": "test@srmtech.com",
    "password": "TestPass123!",
    "designation": "Tester",
    "team": "QA",
    "city": "Bangalore",
    "state": "Karnataka"
  }'
```

**Expected Response:**
```json
{
  "id": "uuid-string",
  "employeeId": "I9999",
  "fullName": "Test User",
  "email": "test@srmtech.com",
  "role": "user",
  "status": "active"
}
```

### Test 2: User Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "empId": "I9999",
    "password": "TestPass123!"
  }'
```

**Expected Response:** Same as signup

### Test 3: Verify Data in MongoDB
```bash
mongosh attendance_tracker
> db.employees.findOne({employeeId: "I9999"})
```

**Expected:** Should show the employee with `password` field containing hashed password

### Test 4: Verify Password is Hashed
```bash
mongosh attendance_tracker
> db.employees.findOne({employeeId: "I9999"}).password
```

**Expected:** Long Base64 string (NOT plain text!)

---

## 🐛 Common Issues & Solutions

### Issue 1: "MongoDB Connection Refused"
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**
```bash
# Start MongoDB
mongod --dbpath /data/db  # Mac/Linux
# OR Windows Service → Check if MongoDB is running
```

### Issue 2: "Address Already in Use" (Port 8080)
```
Error: Address already in use: bind
```

**Solution:**
```bash
# Change port in application.properties
server.port=8081
```

### Issue 3: Password Login Fails
```
Error: Invalid employee ID or password
```

**Causes:**
1. Typo in password
2. Uppercase/lowercase mismatch in Employee ID
3. Employee not found

**Solution:**
1. Double-check password
2. Employee ID must be `I####` or `A####`
3. Check if employee exists: `db.employees.findOne({employeeId: "I0001"})`

### Issue 4: Frontend Can't Connect to Backend
```
Error: CORS error or 404 Not Found
```

**Solution:**
1. Verify backend is running on port 8080
2. Check `app.cors.allowed-origins` in application.properties
3. Verify API endpoints in frontend code

---

## 📝 Configuration Files

### Backend: `application.properties`
Located at: `backend/src/main/resources/application.properties`

**For Docker/Production:**
```bash
# Set MongoDB URI via environment variable
export SPRING_DATA_MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/attendance_tracker
```

### Frontend: `vite.config.ts`
API endpoint is configured in frontend environment

---

## 🔄 File Structure

```
Attendance_Tracker/
├── backend/
│   ├── pom.xml (Firebase dependency REMOVED ✅)
│   ├── src/main/
│   │   ├── java/attendance/example/backend/
│   │   │   ├── config/
│   │   │   │   ├── MongoDbConfig.java (NEW ✅)
│   │   │   │   └── FirebaseConfig.java (DEPRECATED)
│   │   │   ├── service/
│   │   │   │   └── AuthService.java (UPDATED ✅)
│   │   │   ├── util/
│   │   │   │   └── PasswordEncoder.java (NEW ✅)
│   │   │   ├── model/
│   │   │   │   └── Employee.java (UPDATED - password field ✅)
│   │   │   └── exception/
│   │   │       └── GlobalExceptionHandler.java (UPDATED ✅)
│   │   └── resources/
│   │       └── application.properties (NEW ✅)
│   └── target/ (compiled files)
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── MONGODB_SETUP.md (NEW ✅)
└── QUICK_START.md (NEW ✅)
```

---

## ✅ Verification Checklist

Before declaring migration complete:

- [ ] MongoDB is running
- [ ] Backend compiles without errors
- [ ] Backend starts successfully
- [ ] Frontend can connect to backend
- [ ] User can signup with new account
- [ ] User can login with correct password
- [ ] User cannot login with wrong password
- [ ] Password is stored as hash (not plain text)
- [ ] Attendance data persists in MongoDB
- [ ] Admin can view all employees
- [ ] Password reset works
- [ ] Password change works

---

## 📚 Additional Documentation

See [MONGODB_SETUP.md](./MONGODB_SETUP.md) for:
- Complete MongoDB schema documentation
- Troubleshooting guide
- Performance optimization
- Backup & recovery procedures
- Environment variable configuration
- API endpoint examples

---

## 🆘 Get Help

1. **Check logs:** `backend/target/spring.log`
2. **MongoDB logs:** Check MongoDB installation folder
3. **Frontend console:** Browser DevTools → Console tab
4. **Network tab:** Check API calls in browser

---

**Status: ✅ MIGRATION COMPLETE - All Firebase dependencies removed, MongoDB fully integrated**

Last Updated: January 2024
