package attendance.example.backend.controller;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class HomeController {

    private final MongoTemplate mongoTemplate;

    public HomeController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @GetMapping("/backend")
    public String home() {
        return "Backend Running Successfully";
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "UP");
        status.put("timestamp", java.time.Instant.now().toString());
        try {
            mongoTemplate.getDb().runCommand(new org.bson.Document("ping", 1));
            status.put("mongodb", "CONNECTED");
        } catch (Exception e) {
            status.put("mongodb", "DISCONNECTED");
            status.put("status", "DEGRADED");
        }
        return status;
    }
}
