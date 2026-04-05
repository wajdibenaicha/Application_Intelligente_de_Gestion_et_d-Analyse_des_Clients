package com.example.backend.service;

import org.springframework.stereotype.Service;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import java.util.Base64;

@Service
public class TokenEncryptionService {

    private static final String ALGO = "AES";
    private static final SecretKey key;

    static {
        try {
            KeyGenerator kg = KeyGenerator.getInstance(ALGO);
            kg.init(128);
            key = kg.generateKey();
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize encryption key", e);
        }
    }

    public String encrypt(String data) {
        try {
            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(Cipher.ENCRYPT_MODE, key);
            return Base64.getUrlEncoder().encodeToString(cipher.doFinal(data.getBytes()));
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public String decrypt(String token) {
        try {
            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(Cipher.DECRYPT_MODE, key);
            return new String(cipher.doFinal(Base64.getUrlDecoder().decode(token)));
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
