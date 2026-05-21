package attendance.example.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * Raised when MongoDB Atlas is misconfigured or unreachable.
 */
public class MongoConfigurationException extends ApiException {

    public MongoConfigurationException(String message) {
        super(HttpStatus.SERVICE_UNAVAILABLE, message);
    }
}
