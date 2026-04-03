package com.example.backend.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.backend.models.Administrateur;
import com.example.backend.service.AdministrateurService;

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
    public ResponseEntity<Administrateur> getAdministrateurById(@PathVariable Long id) {
        Administrateur administrateur = administrateurService.getAdministrateurById(id);
        if (administrateur != null) {
            return ResponseEntity.ok(administrateur);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Administrateur> addAdministrateur(@RequestBody Administrateur administrateur) {
        Administrateur saved = administrateurService.addAdministrateur(administrateur);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/login")
    public ResponseEntity<Administrateur> login(@RequestBody Administrateur administrateur) {
        Administrateur loggedIn = administrateurService.login(
                administrateur.getFullName(), administrateur.getPassword());
        if (loggedIn != null) {
            return ResponseEntity.ok(loggedIn);
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Administrateur> updateAdministrateur(@PathVariable Long id,
            @RequestBody Administrateur administrateur) {
        Administrateur updated = administrateurService.updateAdministrateur(id, administrateur);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Administrateur> deleteAdministrateur(@PathVariable Long id) {
        Administrateur existing = administrateurService.getAdministrateurById(id);
        if (existing != null) {
            administrateurService.deleteAdministrateur(id);
            return ResponseEntity.ok(existing);
        }
        return ResponseEntity.notFound().build();
    }
}