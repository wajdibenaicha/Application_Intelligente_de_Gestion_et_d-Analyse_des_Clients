package com.example.backend.controller;

import com.example.backend.service.PasswordResetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/password")
public class PasswordResetController {

    @Autowired
    private PasswordResetService passwordResetService;

    @PostMapping("/forgot")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        boolean found = passwordResetService.sendOtp(email);
        if (found) return ResponseEntity.ok().build();
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        boolean valid = passwordResetService.verifyOtp(body.get("email"), body.get("code"));
        if (valid) return ResponseEntity.ok().build();
        return ResponseEntity.badRequest().body("Code invalide ou expiré.");
    }

    @PostMapping("/reset-with-otp")
    public ResponseEntity<?> resetWithOtp(@RequestBody Map<String, String> body) {
        boolean ok = passwordResetService.resetWithOtp(body.get("email"), body.get("code"), body.get("newPassword"));
        if (ok) return ResponseEntity.ok().build();
        return ResponseEntity.badRequest().body("Code invalide ou expiré.");
    }

    @PostMapping("/reset/{gestionnaireId}")
    public ResponseEntity<?> resetByAdmin(@PathVariable Long gestionnaireId,
                                          @RequestBody Map<String, String> body) {
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.trim().isEmpty())
            return ResponseEntity.badRequest().body("Le mot de passe ne peut pas être vide.");
        boolean ok = passwordResetService.resetPassword(gestionnaireId, newPassword);
        if (ok) return ResponseEntity.ok().build();
        return ResponseEntity.notFound().build();
    }
}
