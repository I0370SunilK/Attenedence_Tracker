# Spring Boot Annotations Guide

This project uses Spring Boot with annotations to configure the backend. Here's what each one does:

---

## Class-level Annotations

### `@RestController` (line 22)
**Purpose:** Marks this class as a REST API controller.
**Effect:** Every method in this class automatically returns JSON/XML data (not HTML pages). Spring automatically serializes the returned objects to JSON.

### `@RequestMapping("/api/auth")` (line 23)
**Purpose:** Sets the base URL path for ALL endpoints in this controller.
**Effect:** Every method's URL gets this prefix. So `@PostMapping("/login")` becomes `POST /api/auth/login`.

### `@Service`
**Used in:** `AuthService.java`, `AttendanceService.java`
**Purpose:** Marks a class as a business logic service.
**Effect:** Spring auto-creates one instance (singleton) and injects it wherever needed via constructor.

### `@Repository`
**Used in:** repository files
**Purpose:** Marks a class as a data access layer.
**Effect:** Spring handles database operations, translates exceptions.

---

## Method-level Annotations

### `@PostMapping("/login")` (line 37)
**Purpose:** Maps HTTP POST requests to this method.
**Effect:** When frontend sends `POST /api/auth/login`, this method runs.

### `@GetMapping("/me")` (line 42)
**Purpose:** Maps HTTP GET requests to this method.
**Effect:** When frontend sends `GET /api/auth/me`, this method runs.

### `@PutMapping("/password")` (line 55)
**Purpose:** Maps HTTP PUT requests to this method.
**Effect:** When frontend sends `PUT /api/auth/password`, this method runs.

---

## Parameter Annotations

### `@RequestBody` (line 38)
```java
public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request)
```
**Purpose:** Takes the JSON from the HTTP request body and converts it into a Java object.
**Effect:** When frontend sends JSON like `{"empId":"A123","password":"..."}`, Spring automatically parses it into a `LoginRequest` object.

### `@PathVariable` (used in other controllers)
```java
@GetMapping("/{employeeId}")
public ... getAttendance(@PathVariable String employeeId)
```
**Purpose:** Extracts a value from the URL path.
**Effect:** For `/api/attendance/A3748`, it extracts `"A3748"`.

### `@RequestParam` (used in other controllers)
```java
@GetMapping("?employeeIds=...&from=...")
public ... (@RequestParam("employeeIds") String ids, @RequestParam(required=false) String from)
```
**Purpose:** Extracts query parameters from the URL.
**Effect:** For `/api/attendance?employeeIds=A,B&from=2026-05-01`, it extracts `"A,B"` and `"2026-05-01"`.

---

## How They Work Together (Example Flow)

```
Frontend api.ts:              fetch("/api/auth/login", { method: "POST", body: {...} })
                                      │
                                      ▼
Spring Boot receives:         POST /api/auth/login
                                      │
Spring matches:               @RequestMapping("/api/auth")  →  AuthController
                                      │
                              @PostMapping("/login")        →  login() method
                                      │
Spring parses body:           @RequestBody LoginRequest     →  Java object
                                      │
                              authService.login(request)    →  Business logic
                                      │
Spring serializes response:   ResponseEntity<AuthResponse>  →  JSON back to frontend
```

## The `@Autowired` vs Constructor Injection

Instead of `@Autowired`, this project uses **constructor injection**:
```java
private final AuthService authService;

// Spring auto-injects AuthService when creating this controller
public AuthController(AuthService authService) {
    this.authService = authService;
}
```
This is the recommended Spring practice - cleaner, easier to test.