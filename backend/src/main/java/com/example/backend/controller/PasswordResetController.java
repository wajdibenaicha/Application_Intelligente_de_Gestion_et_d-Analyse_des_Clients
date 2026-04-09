package com.example.backend.controller;

import com.example.backend.service.PasswordResetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/password")
@CrossOrigin(origins = "http://localhost:4200")
public class PasswordResetController {

    @Autowired
    private PasswordResetService passwordResetService;

    @PostMapping("/forgot")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        boolean found = passwordResetService.sendResetEmail(email);
        if (found) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/reset/{gestionnaireId}")
    public ResponseEntity<?> resetByAdmin(@PathVariable Long gestionnaireId,
                                          @RequestBody Map<String, String> body) {
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Le mot de passe ne peut pas être vide.");
        }
        boolean ok = passwordResetService.resetPassword(gestionnaireId, newPassword);
        if (ok) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
