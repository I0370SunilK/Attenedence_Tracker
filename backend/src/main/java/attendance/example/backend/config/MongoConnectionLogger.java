package attendance.example.backend.config;

import com.mongodb.client.MongoClient;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Verifies Atlas connectivity on startup and logs connection success.
 */
@Component
public class MongoConnectionLogger {

    private static final Logger log = LoggerFactory.getLogger(MongoConnectionLogger.class);

    private final MongoTemplate mongoTemplate;
    private final MongoClient mongoClient;
    private final String mongoUri;

    public MongoConnectionLogger(
            MongoTemplate mongoTemplate,
            MongoClient mongoClient,
            @Value("${spring.data.mongodb.uri}") String mongoUri
    ) {
        this.mongoTemplate = mongoTemplate;
        this.mongoClient = mongoClient;
        this.mongoUri = mongoUri;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void verifyAtlasConnection() {
        String redacted = redactUri(mongoUri);
        try {
            mongoClient.getDatabase(mongoTemplate.getDb().getName())
                    .runCommand(new Document("ping", 1));
            log.info("MongoDB Atlas connection SUCCESS — cluster={}, database={}",
                    redacted,
                    mongoTemplate.getDb().getName());
            log.info("Collections in Atlas (auto-created on first insert): employees, attendance_records, notifications, employee_deletion_requests");
        } catch (Exception exception) {
            log.error("MongoDB Atlas connection FAILED — uri={}", redacted, exception);
            throw new IllegalStateException("Cannot connect to MongoDB Atlas. Check MONGODB_URI and Atlas network access.", exception);
        }
    }

    public static String redactUri(String uri) {
        if (uri == null || uri.isBlank()) {
            return "(not set)";
        }
        return uri.replaceAll("://([^:@/]+):([^@/]+)@", "://$1:***@");
    }
}
