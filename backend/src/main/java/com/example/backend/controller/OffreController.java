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
    public ResponseEntity<Offre> create(@RequestBody Map<String, Object> body) {
        if (body.get("title") == null || body.get("description") == null) {
            return ResponseEntity.badRequest().build();
        }
        Offre offre = new Offre();
        offre.setTitle(body.get("title").toString());
        offre.setDescription(body.get("description").toString());
        return ResponseEntity.ok(offreRepository.save(offre));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Offre> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return offreRepository.findById(id).map(o -> {
            if (body.get("title") != null) o.setTitle(body.get("title").toString());
            if (body.get("description") != null) o.setDescription(body.get("description").toString());
            return ResponseEntity.ok(offreRepository.save(o));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        offreRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    

    

    
}
