package attendance.example.backend.exception;

import attendance.example.backend.dto.ErrorResponse;
import com.mongodb.MongoException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException exception) {
        HttpStatus status = exception.getStatus();
        return ResponseEntity.status(status)
                .body(new ErrorResponse(exception.getMessage(), status.value()));
    }

    @ExceptionHandler({MongoException.class, DataAccessException.class})
    public ResponseEntity<ErrorResponse> handleMongoException(
            Exception exception,
            HttpServletRequest request
    ) {
        log.error("MongoDB Atlas error on {} {} — {}", request.getMethod(), request.getRequestURI(), exception.getMessage(), exception);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ErrorResponse(
                        "Database operation failed. Ensure MongoDB Atlas is reachable and MONGODB_URI is correct.",
                        HttpStatus.SERVICE_UNAVAILABLE.value()
                ));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(
            IllegalStateException exception,
            HttpServletRequest request
    ) {
        if (exception.getMessage() != null && exception.getMessage().toLowerCase().contains("mongodb")) {
            log.error("MongoDB configuration error on {} {} — {}", request.getMethod(), request.getRequestURI(), exception.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new ErrorResponse(exception.getMessage(), HttpStatus.SERVICE_UNAVAILABLE.value()));
        }
        return handleUnexpectedException(exception, request);
    }

    @ExceptionHandler({
            MissingServletRequestPartException.class,
            MultipartException.class,
            HttpMediaTypeNotSupportedException.class
    })
    public ResponseEntity<ErrorResponse> handleUploadRequestError(
            Exception exception,
            HttpServletRequest request
    ) {
        log.error("Upload request error while handling {} {}", request.getMethod(), request.getRequestURI(), exception);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(
                        "CSV upload request is invalid. Restart the backend and try the CSV file again.",
                        HttpStatus.BAD_REQUEST.value()
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpectedException(
            Exception exception,
            HttpServletRequest request
    ) {
        log.error("Unexpected error while handling {} {}", request.getMethod(), request.getRequestURI(), exception);
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        return ResponseEntity.status(status)
                .body(new ErrorResponse("Something went wrong on the server. Please try again.", status.value()));
    }
}
