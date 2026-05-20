package attendance.example.backend.util;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Password hashing utility using PBKDF2 algorithm
 * Provides secure password encoding and verification
 */
public class PasswordEncoder {
    
    private static final String ALGORITHM = "PBKDF2WithHmacSHA256";
    private static final int ITERATIONS = 10000;
    private static final int KEY_LENGTH = 256;
    private static final int SALT_LENGTH = 16;
    
    /**
     * Encodes (hashes) a plain text password
     * @param password The plain text password
     * @return A hashed password with salt encoded as Base64
     */
    public static String encode(String password) {
        try {
            // Generate salt
            SecureRandom random = new SecureRandom();
            byte[] salt = new byte[SALT_LENGTH];
            random.nextBytes(salt);
            
            // Hash password with salt using PBKDF2
            javax.crypto.spec.PBEKeySpec spec = new javax.crypto.spec.PBEKeySpec(
                    password.toCharArray(),
                    salt,
                    ITERATIONS,
                    KEY_LENGTH
            );
            
            javax.crypto.SecretKeyFactory factory = javax.crypto.SecretKeyFactory.getInstance(ALGORITHM);
            byte[] hash = factory.generateSecret(spec).getEncoded();
            
            // Combine salt and hash
            byte[] saltAndHash = new byte[salt.length + hash.length];
            System.arraycopy(salt, 0, saltAndHash, 0, salt.length);
            System.arraycopy(hash, 0, saltAndHash, salt.length, hash.length);
            
            // Return Base64 encoded string
            return Base64.getEncoder().encodeToString(saltAndHash);
        } catch (Exception e) {
            throw new RuntimeException("Error encoding password", e);
        }
    }
    
    /**
     * Verifies a plain text password against a hashed password
     * @param password The plain text password to verify
     * @param hashedPassword The hashed password (from database)
     * @return true if password matches, false otherwise
     */
    public static boolean matches(String password, String hashedPassword) {
        try {
            // Decode the stored hash
            byte[] saltAndHash = Base64.getDecoder().decode(hashedPassword);
            
            // Extract salt
            byte[] salt = new byte[SALT_LENGTH];
            System.arraycopy(saltAndHash, 0, salt, 0, SALT_LENGTH);
            
            // Hash the provided password with the extracted salt
            javax.crypto.spec.PBEKeySpec spec = new javax.crypto.spec.PBEKeySpec(
                    password.toCharArray(),
                    salt,
                    ITERATIONS,
                    KEY_LENGTH
            );
            
            javax.crypto.SecretKeyFactory factory = javax.crypto.SecretKeyFactory.getInstance(ALGORITHM);
            byte[] hash = factory.generateSecret(spec).getEncoded();
            
            // Compare hashes
            byte[] storedHash = new byte[saltAndHash.length - SALT_LENGTH];
            System.arraycopy(saltAndHash, SALT_LENGTH, storedHash, 0, storedHash.length);
            
            return MessageDigest.isEqual(hash, storedHash);
        } catch (Exception e) {
            return false;
        }
    }
}
