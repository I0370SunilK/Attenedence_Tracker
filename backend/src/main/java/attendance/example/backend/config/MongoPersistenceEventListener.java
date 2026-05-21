package attendance.example.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.mapping.event.AbstractMongoEventListener;
import org.springframework.data.mongodb.core.mapping.event.AfterSaveEvent;
import org.springframework.stereotype.Component;

/**
 * Logs every document persisted to MongoDB Atlas (insert/update via repository.save).
 */
@Component
public class MongoPersistenceEventListener extends AbstractMongoEventListener<Object> {

    private static final Logger log = LoggerFactory.getLogger(MongoPersistenceEventListener.class);

    @Override
    public void onAfterSave(AfterSaveEvent<Object> event) {
        String collection = event.getCollectionName();
        Object source = event.getSource();
        String documentId = extractId(source);
        log.info("Document saved successfully to MongoDB Atlas — collection={}, insertedMongoDocumentId={}",
                collection, documentId);
    }

    private static String extractId(Object source) {
        if (source == null) {
            return "(unknown)";
        }
        try {
            var idMethod = source.getClass().getMethod("getId");
            Object id = idMethod.invoke(source);
            return id != null ? id.toString() : "(generated)";
        } catch (ReflectiveOperationException ignored) {
            return "(generated)";
        }
    }
}
