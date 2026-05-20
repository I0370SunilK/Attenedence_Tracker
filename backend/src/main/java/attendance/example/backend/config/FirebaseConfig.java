package attendance.example.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Configuration
public class FirebaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);

    private static final String ENV_VAR_NAME = "FIREBASE_SERVICE_ACCOUNT_JSON";

    private final Resource serviceAccountResource;

    public FirebaseConfig(@Value("classpath:${firebase.service-account-path}") Resource serviceAccountResource) {
        this.serviceAccountResource = serviceAccountResource;
    }

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        InputStream stream = getServiceAccountStream();

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(stream))
                .build();

        if (FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.initializeApp(options);
        }

        return FirebaseApp.getInstance();
    }

    /**
     * Reads the Firebase service account JSON from either:
     * 1. The FIREBASE_SERVICE_ACCOUNT_JSON environment variable (preferred for production/Render)
     * 2. The classpath resource file (fallback for local development)
     */
    private InputStream getServiceAccountStream() throws IOException {
        String envJson = System.getenv(ENV_VAR_NAME);
        if (envJson != null && !envJson.isBlank()) {
            logger.info("Loading Firebase credentials from environment variable: {}", ENV_VAR_NAME);
            return new ByteArrayInputStream(envJson.getBytes(StandardCharsets.UTF_8));
        }

        logger.info("Environment variable {} not set. Falling back to classpath resource: {}",
                ENV_VAR_NAME, serviceAccountResource.getDescription());
        return serviceAccountResource.getInputStream();
    }
}
