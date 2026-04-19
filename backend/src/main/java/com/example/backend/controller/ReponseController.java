package com.example.backend.controller;

import com.example.backend.models.Reponse;
import com.example.backend.service.ReponseService;
import com.example.backend.service.EnvoiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reponses")
@CrossOrigin(origins = "http://localhost:4200")
public class ReponseController {

    @Autowired
    private ReponseService reponseService;

    @Autowired
    private EnvoiService envoiService;

    @GetMapping
    public List<Reponse> getAll() {
        return reponseService.getAllReponses();
    }

    @GetMapping("/questionnaire/{id}")
    public List<Reponse> getByQuestionnaire(@PathVariable Long id) {
        return reponseService.getReponsesByQuestionnaire(id);
    }

    @PostMapping
    public Reponse create(@RequestBody Reponse reponse) {
        return reponseService.addReponse(reponse);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        reponseService.deleteReponse(id);
    }

    @DeleteMapping("/client/{clientId}/questionnaire/{questionnaireId}")
    public void deleteByClientAndQuestionnaire(@PathVariable Long clientId, @PathVariable Long questionnaireId) {
        reponseService.deleteByClientAndQuestionnaire(clientId, questionnaireId);
    }

    @DeleteMapping("/questionnaire/{questionnaireId}/all")
    public void deleteAllByQuestionnaire(@PathVariable Long questionnaireId) {
        reponseService.deleteByQuestionnaire(questionnaireId);
    }

    @PostMapping("/repondre")
    public ResponseEntity<?> repondre(@RequestParam String token, @RequestBody List<Map<String, Object>> reponses) {
        boolean ok = envoiService.traiterReponse(token, reponses);
        return ok ? ResponseEntity.ok().build() : ResponseEntity.badRequest().build();
    }
}