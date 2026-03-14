package com.example.backend.controller;

import com.example.backend.Repository.OffreRepository;
import com.example.backend.models.Offre;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/offres")
@CrossOrigin(origins = "http://localhost:4200")
public class OffreController {

    @Autowired
    private OffreRepository offreRepository;

    @GetMapping
    public List<Offre> getAll() {
        return offreRepository.findAll();
    }

    @PutMapping("/{id}/accepter")
    public ResponseEntity<Offre> accepter(@PathVariable Long id) {
        return offreRepository.findById(id).map(o -> {
            o.setStatut("ACCEPTE");
            return ResponseEntity.ok(offreRepository.save(o));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/rejeter")
    public ResponseEntity<Offre> rejeter(@PathVariable Long id) {
        return offreRepository.findById(id).map(o -> {
            o.setStatut("REJETE");
            return ResponseEntity.ok(offreRepository.save(o));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/manuelle")
    public ResponseEntity<Offre> manuelle(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return offreRepository.findById(id).map(o -> {
            o.setOffreManuelle(body.get("offreManuelle"));
            return ResponseEntity.ok(offreRepository.save(o));
        }).orElse(ResponseEntity.notFound().build());
    }
}