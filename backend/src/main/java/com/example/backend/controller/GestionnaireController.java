package com.example.backend.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.backend.models.Gestionnaire;
import com.example.backend.security.JwtUtil;
import com.example.backend.service.GestionnaireService;

@RestController
@RequestMapping("/api/gestionnaires")
public class GestionnaireController {

    @Autowired
    private GestionnaireService gestionnaireService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Gestionnaire gestionnaire) {
        Gestionnaire loggedIn = gestionnaireService.login(
                gestionnaire.getFullName(), gestionnaire.getPassword());
        if (loggedIn != null) {
            String token = jwtUtil.generateToken(loggedIn.getId(), loggedIn.getFullName(), "gestionnaire");
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("id", loggedIn.getId());
            response.put("fullName", loggedIn.getFullName());
            response.put("email", loggedIn.getEmail() != null ? loggedIn.getEmail() : "");
            response.put("role", "gestionnaire");
            response.put("gestionnaireRole", loggedIn.getRole() != null ? loggedIn.getRole().getName() : null);
            response.put("gestionnairePermissions", loggedIn.getRole() != null
                ? loggedIn.getRole().getPermissions().stream()
                    .map(p -> p.getDescription())
                    .collect(Collectors.toList())
                : new ArrayList<>());
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    @GetMapping
    public ResponseEntity<List<Gestionnaire>> getAllGestionnaires() {
        return ResponseEntity.ok(gestionnaireService.getAllGestionnaires());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Gestionnaire> getGestionnaireById(@PathVariable Long id) {
        Gestionnaire gestionnaire = gestionnaireService.getGestionnaireById(id);
        if (gestionnaire != null) {
            return ResponseEntity.ok(gestionnaire);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> addGestionnaire(@RequestBody Gestionnaire gestionnaire) {
        if (gestionnaire.getFullName() == null || gestionnaire.getFullName().isBlank())
            return ResponseEntity.badRequest().body("Le nom complet est obligatoire");
        if (gestionnaire.getEmail() == null || gestionnaire.getEmail().isBlank())
            return ResponseEntity.badRequest().body("L'email est obligatoire");
        if (gestionnaire.getPassword() == null || gestionnaire.getPassword().isBlank())
            return ResponseEntity.badRequest().body("Le mot de passe est obligatoire");
        if (gestionnaire.getPassword().length() < 6)
            return ResponseEntity.badRequest().body("Le mot de passe doit contenir au moins 6 caractères");
        Gestionnaire saved = gestionnaireService.addGestionnaire(gestionnaire);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateGestionnaire(@PathVariable Long id,
            @RequestBody Gestionnaire gestionnaire) {
        if (gestionnaire.getFullName() == null || gestionnaire.getFullName().isBlank())
            return ResponseEntity.badRequest().body("Le nom complet est obligatoire");
        if (gestionnaire.getEmail() == null || gestionnaire.getEmail().isBlank())
            return ResponseEntity.badRequest().body("L'email est obligatoire");
        if (gestionnaire.getPassword() != null && !gestionnaire.getPassword().isBlank()
                && gestionnaire.getPassword().length() < 6)
            return ResponseEntity.badRequest().body("Le mot de passe doit contenir au moins 6 caractères");
        Gestionnaire updated = gestionnaireService.updateGestionnaire(id, gestionnaire);
        if (updated != null) return ResponseEntity.ok(updated);
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Gestionnaire> deleteGestionnaire(@PathVariable Long id) {
        Gestionnaire deleted = gestionnaireService.deleteGestionnaire(id);
        if (deleted != null) {
            return ResponseEntity.ok(deleted);
        }
        return ResponseEntity.notFound().build();
    }
}