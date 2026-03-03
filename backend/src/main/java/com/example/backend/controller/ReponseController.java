package com.example.backend.controller;

import com.example.backend.models.Reponse;
import com.example.backend.service.ReponseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reponses")
@CrossOrigin(origins = "http://localhost:4200")
public class ReponseController {

    @Autowired
    private ReponseService reponseService;

    @GetMapping
    public ResponseEntity<List<Reponse>> getAllReponses() {
        return ResponseEntity.ok(reponseService.getAllReponses());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Reponse> getReponseById(@PathVariable long id) {
        Reponse reponse = reponseService.getReponseById(id);
        if (reponse != null) {
            return ResponseEntity.ok(reponse);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Reponse> addReponse(@RequestBody Reponse reponse) {
        Reponse savedReponse = reponseService.addReponse(reponse);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedReponse);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Reponse> updateReponse(@PathVariable long id, @RequestBody Reponse reponse) {
        Reponse updatedReponse = reponseService.updateReponse(id, reponse);
        if (updatedReponse != null) {
            return ResponseEntity.ok(updatedReponse);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Reponse> deleteReponse(@PathVariable long id) {
        Reponse deletedReponse = reponseService.deleteReponse(id);
        if (deletedReponse != null) {
            return ResponseEntity.ok(deletedReponse);
        }
        return ResponseEntity.notFound().build();
    }
}
