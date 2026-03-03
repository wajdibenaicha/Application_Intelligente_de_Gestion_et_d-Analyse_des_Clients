package com.example.backend.controller;

import com.example.backend.models.Questionnaire;
import com.example.backend.service.QuestionnaireService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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
    public ResponseEntity<List<Questionnaire>> getAllQuestionnaires() {
        return ResponseEntity.ok(questionnaireService.getQuestionnaireRepository());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Questionnaire> getQuestionnaireById(@PathVariable long id) {
        Questionnaire questionnaire = questionnaireService.getQuestionnaireById(id);
        if (questionnaire != null) {
            return ResponseEntity.ok(questionnaire);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Questionnaire> addQuestionnaire(@RequestBody Questionnaire questionnaire) {
        Questionnaire savedQuestionnaire = questionnaireService.ADDQuestionnaire(questionnaire);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedQuestionnaire);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Questionnaire> updateQuestionnaire(@PathVariable long id, @RequestBody Questionnaire questionnaire) {
        Questionnaire updatedQuestionnaire = questionnaireService.updateQuestionnaire(id, questionnaire);
        if (updatedQuestionnaire != null) {
            return ResponseEntity.ok(updatedQuestionnaire);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Questionnaire> deleteQuestionnaire(@PathVariable long id) {
        Questionnaire deletedQuestionnaire = questionnaireService.deleteQuestionnaire(id);
        if (deletedQuestionnaire != null) {
            return ResponseEntity.ok(deletedQuestionnaire);
        }
        return ResponseEntity.notFound().build();
    }
}
