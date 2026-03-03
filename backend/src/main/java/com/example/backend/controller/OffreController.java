package com.example.backend.controller;

import com.example.backend.models.Offre;
import com.example.backend.service.OffreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/offres")
@CrossOrigin(origins = "http://localhost:4200")
public class OffreController {

    @Autowired
    private OffreService offreService;

    @GetMapping
    public ResponseEntity<List<Offre>> getAllOffres() {
        return ResponseEntity.ok(offreService.getAllOffres());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Offre> getOffreById(@PathVariable long id) {
        Offre offre = offreService.getOffreById(id);
        if (offre != null) {
            return ResponseEntity.ok(offre);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Offre> addOffre(@RequestBody Offre offre) {
        Offre savedOffre = offreService.addOffre(offre);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedOffre);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Offre> updateOffre(@PathVariable long id, @RequestBody Offre offre) {
        Offre updatedOffre = offreService.updateOffre(id, offre);
        if (updatedOffre != null) {
            return ResponseEntity.ok(updatedOffre);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Offre> deleteOffre(@PathVariable long id) {
        Offre deletedOffre = offreService.deleteOffre(id);
        if (deletedOffre != null) {
            return ResponseEntity.ok(deletedOffre);
        }
        return ResponseEntity.notFound().build();
    }
}
