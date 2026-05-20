package attendance.example.backend.config;

import org.springframework.context.annotation.Configuration;

/**
 * Firebase Configuration - DEPRECATED
 * 
 * This class is no longer used. The application now uses MongoDB for all
 * data storage and local password hashing for authentication.
 * 
 * Migration from Firebase to MongoDB:
 * - User authentication: Now handled locally using PBKDF2 password hashing
 * - Data persistence: MongoDB instead of Firestore
 * - Password storage: Hashed and salted in MongoDB using PasswordEncoder utility
 * 
 * @deprecated Use MongoDB directly instead
 */
@Configuration
public class FirebaseConfig {
    // Firebase configuration removed - using MongoDB instead
}
