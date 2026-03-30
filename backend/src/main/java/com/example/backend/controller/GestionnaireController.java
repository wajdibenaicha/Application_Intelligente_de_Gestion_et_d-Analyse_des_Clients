package com.example.backend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.models.Gestionnaire;
import com.example.backend.service.GestionnaireService;

@RestController
@RequestMapping("/api/gestionnaires")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:4201"})
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
        Gestionnaire savedGestionnaire = gestionnaireService.addGestionnaire(gestionnaire);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedGestionnaire);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Gestionnaire> updateGestionnaire(@PathVariable Long id,
            @RequestBody Gestionnaire gestionnaire) {
        Gestionnaire updatedGestionnaire = gestionnaireService.updateGestionnaire(id, gestionnaire);
        if (updatedGestionnaire != null) {
            return ResponseEntity.ok(updatedGestionnaire);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Gestionnaire> deleteGestionnaire(@PathVariable Long id) {
        Gestionnaire deletedGestionnaire = gestionnaireService.deleteGestionnaire(id);
        if (deletedGestionnaire != null) {
            return ResponseEntity.ok(deletedGestionnaire);
        }
        return ResponseEntity.notFound().build();
    }
}
