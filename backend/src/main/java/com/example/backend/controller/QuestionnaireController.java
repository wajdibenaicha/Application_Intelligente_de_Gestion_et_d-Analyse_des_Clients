package com.example.backend.controller;

import com.example.backend.models.Questionnaire;
import com.example.backend.service.QuestionnaireService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/questionnaires")
@CrossOrigin(origins = "http://localhost:4200")
public class QuestionnaireController {

    @Autowired
    private QuestionnaireService questionnaireService;

    @GetMapping
    public List<Questionnaire> getAll() {
        return questionnaireService.getAll();
    }

    @GetMapping("/gestionnaire/{id}")
    public List<Questionnaire> getByGestionnaire(@PathVariable Long id) {
        return questionnaireService.getAll();
    }

    @PostMapping
    public ResponseEntity<Questionnaire> create(@RequestBody Questionnaire questionnaire) {
        try {
            questionnaire.setId(null);
            if (questionnaire.getQuestions() != null) {
                questionnaire.getQuestions().forEach(q -> q.setId(null));
            }
            return ResponseEntity.ok(questionnaireService.save(questionnaire));
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Questionnaire> update(@PathVariable Long id, @RequestBody Questionnaire questionnaire) {
        return questionnaireService.findById(id).map(existing -> {
            existing.setTitre(questionnaire.getTitre());
            existing.setQuestions(questionnaire.getQuestions());
            return ResponseEntity.ok(questionnaireService.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        questionnaireService.delete(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/demander-publication")
    public ResponseEntity<Questionnaire> demanderPublication(@PathVariable Long id) {
        return questionnaireService.findById(id).map(q -> ResponseEntity.ok(questionnaireService.save(q)))
                .orElse(ResponseEntity.notFound().build());
    }
}