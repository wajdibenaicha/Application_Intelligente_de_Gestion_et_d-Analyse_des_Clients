package com.example.backend.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.backend.models.Gestionnaire;
import com.example.backend.service.GestionnaireService;

@RestController
@RequestMapping("/api/gestionnaires")
@CrossOrigin(origins = "http://localhost:4200")
public class GestionnaireController {

    @Autowired
    private GestionnaireService gestionnaireService;

    @PostMapping("/login")
    public ResponseEntity<Gestionnaire> login(@RequestBody Gestionnaire gestionnaire) {
        Gestionnaire loggedIn = gestionnaireService.login(
                gestionnaire.getFullName(), gestionnaire.getPassword());
        if (loggedIn != null)
            return ResponseEntity.ok(loggedIn);
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
    public ResponseEntity<Gestionnaire> addGestionnaire(@RequestBody Gestionnaire gestionnaire) {
        if (gestionnaire.getFullName() == null || gestionnaire.getFullName().isBlank()
                || gestionnaire.getEmail() == null || gestionnaire.getEmail().isBlank()
                || gestionnaire.getPassword() == null || gestionnaire.getPassword().isBlank()
                || gestionnaire.getRole() == null) {
            return ResponseEntity.badRequest().build();
        }
        Gestionnaire saved = gestionnaireService.addGestionnaire(gestionnaire);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Gestionnaire> updateGestionnaire(@PathVariable Long id,
            @RequestBody Gestionnaire gestionnaire) {
        if (gestionnaire.getFullName() == null || gestionnaire.getFullName().isBlank()
                || gestionnaire.getEmail() == null || gestionnaire.getEmail().isBlank()
                || gestionnaire.getRole() == null) {
            return ResponseEntity.badRequest().build();
        }
        Gestionnaire updated = gestionnaireService.updateGestionnaire(id, gestionnaire);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
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