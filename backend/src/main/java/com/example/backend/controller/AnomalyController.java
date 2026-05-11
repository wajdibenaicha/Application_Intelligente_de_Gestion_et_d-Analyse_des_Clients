package com.example.backend.controller;

import com.example.backend.service.AnomalyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/anomaly")
public class AnomalyController {

    @Autowired private AnomalyService anomalyService;

    /** Analyse la soumission d'un client à un questionnaire. */
    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> check(
            @RequestParam Long clientId,
            @RequestParam Long questionnaireId) {
        return ResponseEntity.ok(anomalyService.analyzeSubmission(clientId, questionnaireId));
    }

    /** Analyse toutes les soumissions d'un questionnaire (badge ⚠️ en masse). */
    @GetMapping("/questionnaire/{questionnaireId}")
    public ResponseEntity<List<Map<String, Object>>> analyzeQuestionnaire(
            @PathVariable Long questionnaireId) {
        return ResponseEntity.ok(anomalyService.analyzeQuestionnaire(questionnaireId));
    }
}
