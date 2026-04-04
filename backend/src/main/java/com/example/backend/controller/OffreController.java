package com.example.backend.controller;

import com.example.backend.models.Offre;
import com.example.backend.service.OffreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/offres")
@CrossOrigin(origins = { "http://localhost:4200", "http://localhost:4201" })
public class OffreController {

    @Autowired
    private OffreService offreService;

    @GetMapping
    public List<Offre> getAll() {
        return offreService.getAllOffres();
    }

    @PostMapping
    public ResponseEntity<Offre> create(@RequestBody Map<String, Object> body) {
        if (body.get("title") == null || body.get("description") == null) {
            return ResponseEntity.badRequest().build();
        }
        Offre offre = new Offre();
        offre.setTitle(body.get("title").toString());
        offre.setDescription(body.get("description").toString());
        return ResponseEntity.ok(offreService.addOffre(offre));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Offre> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Offre existing = offreService.getOffreById(id);
        if (existing == null)
            return ResponseEntity.notFound().build();
        if (body.get("title") != null)
            existing.setTitle(body.get("title").toString());
        if (body.get("description") != null)
            existing.setDescription(body.get("description").toString());
        return ResponseEntity.ok(offreService.updateOffre(id, existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        offreService.deleteOffre(id);
        return ResponseEntity.ok().build();
    }

}
