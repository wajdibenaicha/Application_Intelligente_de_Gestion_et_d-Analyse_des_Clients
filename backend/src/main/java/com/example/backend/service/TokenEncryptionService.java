package com.example.backend.service;

import org.springframework.stereotype.Service;
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

@Service
public class TokenEncryptionService {

    // Fixed 16-byte AES-128 key — must never change or all existing tokens break
    private static final byte[] KEY_BYTES = "STAR2026Secret!K".getBytes();
    private static final SecretKeySpec KEY = new SecretKeySpec(KEY_BYTES, "AES");

    public String encrypt(String data) {
        try {
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, KEY);
            return Base64.getUrlEncoder().withoutPadding()
                         .encodeToString(cipher.doFinal(data.getBytes("UTF-8")));
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public String decrypt(String token) {
        try {
            // Accept both padded (==) and unpadded base64url
            String normalized = token.replace('+', '-').replace('/', '_');
            byte[] decoded = Base64.getUrlDecoder().decode(normalized);
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, KEY);
            return new String(cipher.doFinal(decoded), "UTF-8");
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed: " + e.getMessage(), e);
        }
    }
}
