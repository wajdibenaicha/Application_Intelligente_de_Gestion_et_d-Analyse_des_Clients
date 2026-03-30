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
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:4201"})
public class OffreController {

    @Autowired
    private OffreRepository offreRepository;

    @GetMapping
    public List<Offre> getAll() {
        return offreRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Offre> create(@RequestBody Map<String, String> body) {
        Offre o = new Offre();
        o.setTitle(body.get("title"));
        o.setDescription(body.get("description"));
        return ResponseEntity.ok(offreRepository.save(o));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Offre> update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return offreRepository.findById(id).map(o -> {
            if (body.get("title") != null) o.setTitle(body.get("title"));
            if (body.get("description") != null) o.setDescription(body.get("description"));
            return ResponseEntity.ok(offreRepository.save(o));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        offreRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/accepter")
    public ResponseEntity<Offre> accepter(@PathVariable Long id) {
        return offreRepository.findById(id).map(o -> ResponseEntity.ok(offreRepository.save(o)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/rejeter")
    public ResponseEntity<Offre> rejeter(@PathVariable Long id) {
        return offreRepository.findById(id).map(o -> ResponseEntity.ok(offreRepository.save(o)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/manuelle")
    public ResponseEntity<Offre> manuelle(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return offreRepository.findById(id).map(o -> ResponseEntity.ok(offreRepository.save(o)))
                .orElse(ResponseEntity.notFound().build());
    }
}