package attendance.example.backend.config;

import com.mongodb.ConnectionString;

/**
 * Ensures the application never starts with local MongoDB or a non-Atlas cluster.
 */
public final class MongoAtlasUriValidator {

    private MongoAtlasUriValidator() {
    }

    public static void validate(String mongoUri, String requiredHostFragment) {
        if (mongoUri == null || mongoUri.isBlank()) {
            throw new IllegalStateException(
                    "MONGODB_URI is required. Copy .env.example to .env in the project root with your Atlas connection string."
            );
        }
        String lower = mongoUri.toLowerCase();
        if (lower.contains("localhost") || lower.contains("127.0.0.1")) {
            throw new IllegalStateException("Local MongoDB is disabled. Use MongoDB Atlas (mongodb+srv://...) only.");
        }
        if (!mongoUri.startsWith("mongodb+srv://")) {
            throw new IllegalStateException("MongoDB Atlas SRV connection string is required (mongodb+srv://...).");
        }
        if (requiredHostFragment != null && !requiredHostFragment.isBlank()
                && !lower.contains(requiredHostFragment.toLowerCase())) {
            throw new IllegalStateException(
                    "MONGODB_URI must target cluster " + requiredHostFragment + ". Got: " + MongoConnectionLogger.redactUri(mongoUri)
            );
        }
        ConnectionString connectionString = new ConnectionString(mongoUri);
        String database = connectionString.getDatabase();
        if (database == null || database.isBlank()) {
            throw new IllegalStateException(
                    "MONGODB_URI must include database name, e.g. ...mongodb.net/attendance_tracker?..."
            );
        }
    }
}
