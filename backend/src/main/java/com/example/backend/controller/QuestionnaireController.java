package com.example.backend.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.backend.Repository.GestionnaireRepository;
import com.example.backend.Repository.QuestionRepository;
import com.example.backend.models.Gestionnaire;
import com.example.backend.models.Question;
import com.example.backend.models.Questionnaire;
import com.example.backend.service.QuestionnaireService;

@RestController
@RequestMapping("/api/questionnaires")
@CrossOrigin(origins = "http://localhost:4200")
public class QuestionnaireController {

    @Autowired
    private QuestionnaireService questionnaireService;

    @Autowired
    private GestionnaireRepository gestionnaireRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @GetMapping
    public List<Questionnaire> getAll() {
        return questionnaireService.getAll();
    }

    @GetMapping("/gestionnaire/{id}")
    public List<Questionnaire> getByGestionnaire(@PathVariable Long id) {
        return questionnaireService.getByGestionnaireId(id);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Questionnaire> getById(@PathVariable Long id) {
        Questionnaire q = questionnaireService.getQuestionnaireById(id);
        if (q != null) {
            return ResponseEntity.ok(q);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            String titre = body.get("titre") != null ? body.get("titre").toString().trim() : null;
            String description = body.get("description") != null ? body.get("description").toString().trim() : null;
            if (titre == null || titre.isBlank()) {
                return ResponseEntity.badRequest().body("Le titre est obligatoire.");
            }
            if (description == null || description.isBlank()) {
                return ResponseEntity.badRequest().body("La description est obligatoire.");
            }
            List<?> rawQuestions = body.get("questions") instanceof List ? (List<?>) body.get("questions") : null;
            if (rawQuestions == null || rawQuestions.isEmpty()) {
                return ResponseEntity.badRequest().body("Au moins une question est obligatoire.");
            }

            Questionnaire questionnaire = new Questionnaire();
            questionnaire.setTitre(titre);
            questionnaire.setDescription(description);
            questionnaire.setConfirmed(false);

            if (body.get("gestionnaire") != null) {
                Object gestObj = body.get("gestionnaire");
                if (gestObj instanceof Map) {
                    Object idObj = ((Map<?, ?>) gestObj).get("id");
                    if (idObj != null) {
                        Long gId = Long.valueOf(idObj.toString());
                        Gestionnaire g = gestionnaireRepository.findById(gId).orElse(null);
                        questionnaire.setGestionnaire(g);
                    }
                }
            }

            List<Question> questionList = new ArrayList<>();
            for (Object item : rawQuestions) {
                if (item instanceof Map) {
                    Map<?, ?> qData = (Map<?, ?>) item;
                    Question q;
                    if (qData.get("id") != null) {
                        Long qId = Long.valueOf(qData.get("id").toString());
                        q = questionRepository.findById(qId).orElse(new Question());
                    } else {
                        q = new Question();
                    }
                    q.setTitre(qData.get("titre") != null ? qData.get("titre").toString() : "");
                    q.setType(qData.get("type") != null ? qData.get("type").toString() : "input");
                    q.setOptions(qData.get("options") != null ? qData.get("options").toString() : "");
                    questionList.add(q);
                }
            }
            questionnaire.setQuestions(questionList);

            Questionnaire saved = questionnaireService.save(questionnaire);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            String titre = body.get("titre") != null ? body.get("titre").toString().trim() : null;
            String description = body.get("description") != null ? body.get("description").toString().trim() : null;
            if (titre == null || titre.isBlank()) {
                return ResponseEntity.badRequest().body("Le titre est obligatoire.");
            }
            if (description == null || description.isBlank()) {
                return ResponseEntity.badRequest().body("La description est obligatoire.");
            }
            List<?> rawQuestions = body.get("questions") instanceof List ? (List<?>) body.get("questions") : null;
            if (rawQuestions == null || rawQuestions.isEmpty()) {
                return ResponseEntity.badRequest().body("Au moins une question est obligatoire.");
            }

            Questionnaire existing = questionnaireService.getQuestionnaireById(id);
            if (existing == null) {
                return ResponseEntity.notFound().build();
            }

            existing.setTitre(titre);
            existing.setDescription(description);

            List<Question> questionList = new ArrayList<>();
            for (Object item : rawQuestions) {
                if (item instanceof Map) {
                    Map<?, ?> qData = (Map<?, ?>) item;
                    Question q;
                    if (qData.get("id") != null) {
                        Long qId = Long.valueOf(qData.get("id").toString());
                        q = questionRepository.findById(qId).orElse(new Question());
                    } else {
                        q = new Question();
                    }
                    q.setTitre(qData.get("titre") != null ? qData.get("titre").toString() : "");
                    q.setType(qData.get("type") != null ? qData.get("type").toString() : "input");
                    q.setOptions(qData.get("options") != null ? qData.get("options").toString() : "");
                    questionList.add(q);
                }
            }
            existing.setQuestions(questionList);

            Questionnaire saved = questionnaireService.save(existing);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        questionnaireService.delete(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/confirm")
    public ResponseEntity<Questionnaire> confirmQuestionnaire(@PathVariable Long id) {
        Questionnaire q = questionnaireService.confirmQuestionnaire(id);
        if (q != null) {
            return ResponseEntity.ok(q);
        }
        return ResponseEntity.notFound().build();
    }

    @PatchMapping("/{id}/rejeter")
    public ResponseEntity<Questionnaire> rejeterQuestionnaire(@PathVariable Long id) {
        Questionnaire q = questionnaireService.rejeterQuestionnaire(id);
        if (q != null) {
            return ResponseEntity.ok(q);
        }
        return ResponseEntity.notFound().build();
    }
}