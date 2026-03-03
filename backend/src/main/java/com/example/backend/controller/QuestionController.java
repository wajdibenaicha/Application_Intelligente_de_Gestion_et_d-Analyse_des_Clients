package com.example.backend.controller;

import com.example.backend.models.Question;
import com.example.backend.service.QuestionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
@CrossOrigin(origins = "http://localhost:4200")
public class QuestionController {

    @Autowired
    private QuestionService questionService;

    @GetMapping
    public ResponseEntity<List<Question>> getAllQuestions() {
        return ResponseEntity.ok(questionService.getAllQuestions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Question> getQuestionById(@PathVariable long id) {
        Question question = questionService.getQuestionById(id);
        if (question != null) {
            return ResponseEntity.ok(question);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Question> addQuestion(@RequestBody Question question) {
        Question savedQuestion = questionService.addQuestion(question);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedQuestion);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Question> updateQuestion(@PathVariable long id, @RequestBody Question question) {
        Question updatedQuestion = questionService.updateQuestion(id, question);
        if (updatedQuestion != null) {
            return ResponseEntity.ok(updatedQuestion);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Question> deleteQuestion(@PathVariable long id) {
        Question deletedQuestion = questionService.deleteQuestion(id);
        if (deletedQuestion != null) {
            return ResponseEntity.ok(deletedQuestion);
        }
        return ResponseEntity.notFound().build();
    }
}
