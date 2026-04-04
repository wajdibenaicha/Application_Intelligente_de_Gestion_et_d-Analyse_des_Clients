package com.example.backend.controller;

import com.example.backend.Repository.QuestionRepository;
import com.example.backend.Repository.QuestionnaireRepository;
import com.example.backend.models.Question;
import com.example.backend.models.Questionnaire;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/questions")
@CrossOrigin(origins = "http://localhost:4200")
public class QuestionController {

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private QuestionnaireRepository questionnaireRepository;

    @GetMapping
    public List<Question> getAll() {
        return questionRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Question question) {
        if (question.getTitre() == null || question.getTitre().isBlank()) {
            return ResponseEntity.badRequest().body("Le titre est obligatoire.");
        }
        if (question.getType() != null && !question.getType().equals("text")
                && (question.getOptions() == null || question.getOptions().isBlank())) {
            return ResponseEntity.badRequest().body("Les options sont obligatoires pour ce type de question.");
        }
        return ResponseEntity.ok(questionRepository.save(question));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Question> update(@PathVariable Long id, @RequestBody Question question) {
        return questionRepository.findById(id).map(existing -> {
            existing.setTitre(question.getTitre());
            existing.setType(question.getType());
            existing.setOptions(question.getOptions());
            return ResponseEntity.ok(questionRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        List<Questionnaire> questionnaires = questionnaireRepository.findAll();
        for (Questionnaire q : questionnaires) {
            q.getQuestions().removeIf(question -> question.getId().equals(id));
            questionnaireRepository.save(q);
        }
        questionRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
