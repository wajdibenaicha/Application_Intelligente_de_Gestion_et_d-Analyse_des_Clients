package com.example.backend.controller;

import com.example.backend.models.dto.*;
import com.example.backend.service.IAQuestionnaireService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ia")
@CrossOrigin(origins = "http://localhost:4200")
public class IAController {

    private final IAQuestionnaireService iaService;

    public IAController(IAQuestionnaireService iaService) {
        this.iaService = iaService;
    }

    @PostMapping("/check-doublon")
    public ResponseEntity<Map<String, Object>> checkDoublon(@RequestBody CheckDoublonRequest req) {
        try {
            return ResponseEntity.ok(
                iaService.checkDoublon(req.titre(), req.roleQuestionnaire(), req.existingTitles())
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", true, "message", e.getMessage()));
        }
    }

    @PostMapping("/reformuler-question")
    public ResponseEntity<Map<String, Object>> reformuler(@RequestBody ReformulerRequest req) {
        try {
            return ResponseEntity.ok(iaService.reformuler(req.titre(), req.type()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", true, "message", e.getMessage()));
        }
    }

    @PostMapping("/valider-choix")
    public ResponseEntity<Map<String, Object>> validerChoix(@RequestBody ValiderChoixRequest req) {
        try {
            return ResponseEntity.ok(
                iaService.validerChoix(req.titre(), req.type(), req.options())
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", true, "message", e.getMessage()));
        }
    }

    @PostMapping("/verifier-coherence")
    public ResponseEntity<Map<String, Object>> verifierCoherence(@RequestBody VerifierCoherenceRequest req) {
        try {
            return ResponseEntity.ok(
                iaService.verifierCoherence(req.titre(), req.existingTitles())
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", true, "message", e.getMessage()));
        }
    }

    @PostMapping("/reordonner")
    public ResponseEntity<List<Map<String, Object>>> reordonner(@RequestBody ReordonnerRequest req) {
        try {
            return ResponseEntity.ok(iaService.reordonner(req.questions()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
    }
}
