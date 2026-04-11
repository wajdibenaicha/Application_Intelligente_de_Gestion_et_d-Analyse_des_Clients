package com.example.backend.controller;

import com.example.backend.models.*;
import com.example.backend.service.OffreRecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin(origins = "http://localhost:4200")
public class RecommendationController {

    @Autowired private OffreRecommendationService service;

    @PostMapping("/generate/{clientId}/{questionnaireId}")
    public ResponseEntity<OffreRecommendation> generate(
            @PathVariable Long clientId,
            @PathVariable Long questionnaireId) {
        return ResponseEntity.ok(
            service.generateRecommendation(clientId, questionnaireId));
    }

    @GetMapping
    public ResponseEntity<List<OffreRecommendation>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/pending")
    public ResponseEntity<List<OffreRecommendation>> getPending() {
        return ResponseEntity.ok(service.findByStatus(RecommendationStatus.PENDING));
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<OffreRecommendation> accept(@PathVariable Long id) {
        return ResponseEntity.ok(service.acceptRecommendation(id));
    }

    @PutMapping("/{id}/override/{offreId}")
    public ResponseEntity<OffreRecommendation> override(
            @PathVariable Long id, @PathVariable Long offreId) {
        return ResponseEntity.ok(service.overrideRecommendation(id, offreId));
    }

    @PostMapping("/{id}/send")
    public ResponseEntity<?> send(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(service.sendRecommendation(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }
}
