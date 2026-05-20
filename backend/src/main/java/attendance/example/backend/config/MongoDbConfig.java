package attendance.example.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * MongoDB Configuration
 * Enables Spring Data MongoDB repositories for data persistence
 */
@Configuration
@EnableMongoRepositories(basePackages = "attendance.example.backend.repository")
public class MongoDbConfig {
    // MongoDB configuration is handled automatically by Spring Boot
    // Properties are configured in application.properties:
    // - spring.data.mongodb.uri
    // - spring.data.mongodb.database
    // - spring.data.mongodb.auto-index-creation
}
