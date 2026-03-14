package com.example.backend.controller;

import com.example.backend.models.Gestionnaire;
import com.example.backend.service.GestionnaireService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}