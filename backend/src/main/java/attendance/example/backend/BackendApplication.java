package attendance.example.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;

@SpringBootApplication
public class BackendApplication {

	private static final Logger log = LoggerFactory.getLogger(BackendApplication.class);

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	public ApplicationRunner logMongoUri(Environment env) {
		return args -> {
			String uri = env.getProperty("spring.data.mongodb.uri");
			if (uri == null) {
				log.warn("Resolved spring.data.mongodb.uri is null");
				return;
			}
			String masked = maskMongoUri(uri);
			log.info("Resolved spring.data.mongodb.uri={}", masked);
		};
	}

	private static String maskMongoUri(String uri) {
		try {
			int schemeEnd = uri.indexOf("//");
			int at = uri.indexOf("@");
			if (schemeEnd >= 0 && at > schemeEnd) {
				String scheme = uri.substring(0, schemeEnd + 2);
				String host = uri.substring(at + 1);
				return scheme + "****@" + host;
			}
		} catch (Exception ignored) {
		}
		return uri;
	}

}
