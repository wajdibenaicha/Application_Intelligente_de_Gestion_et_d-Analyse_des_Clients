package com.example.backend.controller;

import com.example.backend.models.Administrateur;
import com.example.backend.service.AdministrateurService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/administrateurs")
@CrossOrigin(origins = "http://localhost:4200")
public class AdministrateurController {

    @Autowired
    private AdministrateurService administrateurService;

    @GetMapping
    public ResponseEntity<List<Administrateur>> getAllAdministrateurs() {
        return ResponseEntity.ok(administrateurService.getAllAdministrateurs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Administrateur> getAdministrateurById(@PathVariable long id) {
        Administrateur administrateur = administrateurService.getAdministrateurById(id);
        if (administrateur != null) {
            return ResponseEntity.ok(administrateur);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Administrateur> addAdministrateur(@RequestBody Administrateur administrateur) {
        Administrateur savedAdministrateur = administrateurService.addAdministrateur(administrateur);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedAdministrateur);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Administrateur> updateAdministrateur(@PathVariable long id, @RequestBody Administrateur administrateur) {
        Administrateur updatedAdministrateur = administrateurService.updateAdministrateur(id, administrateur);
        if (updatedAdministrateur != null) {
            return ResponseEntity.ok(updatedAdministrateur);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Administrateur> deleteAdministrateur(@PathVariable long id) {
        Administrateur existingAdministrateur = administrateurService.getAdministrateurById(id);
        if (existingAdministrateur != null) {
            administrateurService.deleteAdministrateur(id);
            return ResponseEntity.ok(existingAdministrateur);
        }
        return ResponseEntity.notFound().build();
    }
}
