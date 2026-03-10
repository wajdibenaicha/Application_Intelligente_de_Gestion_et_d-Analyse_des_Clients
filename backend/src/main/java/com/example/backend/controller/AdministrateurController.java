
package com.example.backend.controller;

import com.example.backend.service.AdministrateurService;
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

import com.example.backend.models.Administrateur;

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
        Administrateur savedAdministrateur = administrateurService.addAdministrateur(administrateur);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedAdministrateur);
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
        Administrateur updatedAdministrateur = administrateurService.updateAdministrateur(id, administrateur);
        if (updatedAdministrateur != null) {
            return ResponseEntity.ok(updatedAdministrateur);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Administrateur> deleteAdministrateur(@PathVariable Long id) {
        Administrateur existingAdministrateur = administrateurService.getAdministrateurById(id);
        if (existingAdministrateur != null) {
            administrateurService.deleteAdministrateur(id);
            return ResponseEntity.ok(existingAdministrateur);
        }
        return ResponseEntity.notFound().build();
    }
}
