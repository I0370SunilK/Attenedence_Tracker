package attendance.example.backend.config;

import com.mongodb.ConnectionString;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * MongoDB Atlas is the only database. Rejects localhost and non-Atlas URIs at startup.
 */
@Configuration
@EnableMongoRepositories(basePackages = "attendance.example.backend.repository")
public class MongoDbConfig {

    @Bean
    public MongoClient mongoClient(
            @Value("${spring.data.mongodb.uri}") String mongoUri,
            @Value("${app.mongodb.required-host:cluster0.ivqu5bo.mongodb.net}") String requiredHost
    ) {
        MongoAtlasUriValidator.validate(mongoUri, requiredHost);
        return MongoClients.create(new ConnectionString(mongoUri));
    }

    @Bean
    public MongoDatabaseFactory mongoDatabaseFactory(
            MongoClient mongoClient,
            @Value("${spring.data.mongodb.uri}") String mongoUri,
            @Value("${app.mongodb.database:attendance_tracker}") String defaultDatabase
    ) {
        String database = new ConnectionString(mongoUri).getDatabase();
        if (database == null || database.isBlank()) {
            database = defaultDatabase;
        }
        return new SimpleMongoClientDatabaseFactory(mongoClient, database);
    }

    @Bean
    public MongoTemplate mongoTemplate(MongoDatabaseFactory mongoDatabaseFactory) {
        return new MongoTemplate(mongoDatabaseFactory);
    }
}
