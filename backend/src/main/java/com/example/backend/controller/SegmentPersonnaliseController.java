package com.example.backend.controller;

import com.example.backend.models.Gestionnaire;
import com.example.backend.models.SegmentPersonnalise;
import com.example.backend.Repository.GestionnaireRepository;
import com.example.backend.Repository.SegmentPersonnaliseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/segments")
public class SegmentPersonnaliseController {

    @Autowired private SegmentPersonnaliseRepository segmentRepo;
    @Autowired private GestionnaireRepository gestionnaireRepo;

    @GetMapping("/gestionnaire/{gestionnaireId}")
    public List<SegmentPersonnalise> getByGestionnaire(@PathVariable Long gestionnaireId) {
        return segmentRepo.findByGestionnaireIdOrderByCreatedAtDesc(gestionnaireId);
    }

    @PostMapping
    public ResponseEntity<SegmentPersonnalise> create(@RequestBody SegmentPersonnalise segment,
                                                       @RequestParam Long gestionnaireId) {
        Gestionnaire g = gestionnaireRepo.findById(gestionnaireId).orElse(null);
        if (g == null) return ResponseEntity.badRequest().build();
        segment.setGestionnaire(g);
        return ResponseEntity.ok(segmentRepo.save(segment));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SegmentPersonnalise> update(@PathVariable Long id,
                                                       @RequestBody SegmentPersonnalise updated) {
        return segmentRepo.findById(id).map(s -> {
            s.setName(updated.getName());
            s.setDescription(updated.getDescription());
            s.setColor(updated.getColor());
            s.setTypeContrat(updated.getTypeContrat());
            s.setAnneeInscriptionMin(updated.getAnneeInscriptionMin());
            s.setPrimeMin(updated.getPrimeMin());
            s.setPrimeMax(updated.getPrimeMax());
            s.setProfession(updated.getProfession());
            s.setSituationFamiliale(updated.getSituationFamiliale());
            s.setAdresseKeyword(updated.getAdresseKeyword());
            s.setKpiMin(updated.getKpiMin());
            s.setKpiMax(updated.getKpiMax());
            return ResponseEntity.ok(segmentRepo.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        if (!segmentRepo.existsById(id)) return ResponseEntity.notFound().build();
        segmentRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Segment supprimé"));
    }
}
