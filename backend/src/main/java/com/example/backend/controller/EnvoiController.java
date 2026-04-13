package com.example.backend.controller;

import java.util.List;
import java.util.Map;

import com.example.backend.Repository.EnvoiQuestionnaireRepository;
import com.example.backend.models.EnvoiQuestionnaire;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.models.Client;
import com.example.backend.models.Questionnaire;
import com.example.backend.service.EnvoiService;
import com.example.backend.service.QuestionnaireDistributionService;
import com.example.backend.service.QuestionnaireDistributionService.DistributionRequest;
import com.example.backend.service.QuestionnaireService;

@RestController
@RequestMapping("/api/envoi")
@CrossOrigin(origins = "http://localhost:4200")
public class EnvoiController {

    @Autowired private EnvoiService envoiService;
    @Autowired private QuestionnaireDistributionService distributionService;
    @Autowired private QuestionnaireService questionnaireService;
    @Autowired private EnvoiQuestionnaireRepository envoiRepo;

    // Flow A: filter clients for the sharing modal
    @GetMapping("/clients")
    public List<Client> filtrerClients(
            @RequestParam(required = false) String typeContrat,
            @RequestParam(required = false) Integer anneeMin,
            @RequestParam(required = false) String profession) {
        return envoiService.filtrerClients(typeContrat, anneeMin, profession);
    }

    // Flow A: generate a UUID link, copy-paste to client → /repondre?token=
    @PostMapping("/generer-lien")
    public String genererLien(@RequestParam Long questionnaireId, @RequestParam Long clientId) {
        return envoiService.genererLienChiffre(questionnaireId, clientId);
    }

    // Flow A: client opens /repondre?token= → fetch questionnaire
    @GetMapping("/questionnaire")
    public ResponseEntity<Questionnaire> getQuestionnaireByToken(@RequestParam String token) {
        Long questionnaireId = envoiService.dechiffrerToken(token);
        if (questionnaireId == null) {
            return ResponseEntity.badRequest().build();
        }
        Questionnaire q = questionnaireService.getQuestionnaireById(questionnaireId);
        if (q == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(q);
    }

    // Stats: how many clients were sent this questionnaire vs how many responded
    @GetMapping("/stats")
    public Map<String, Long> stats(@RequestParam Long questionnaireId) {
        List<EnvoiQuestionnaire> envois = envoiRepo.findByQuestionnaireId(questionnaireId);
        long sent = envois.size();
        long repondu = envois.stream().filter(EnvoiQuestionnaire::isRepondu).count();
        return Map.of("sent", sent, "repondu", repondu);
    }

    // Flow B: send email/SMS directly → client receives /fill-questionnaire?token=
    @PostMapping("/distribuer")
    public ResponseEntity<?> distribuer(@RequestBody DistributePayload payload) {
        distributionService.distribute(payload.getQuestionnaireId(), payload.getDistributions());
        return ResponseEntity.ok(Map.of("message", "Envoyé avec succès"));
    }

    static class DistributePayload {
        private Long questionnaireId;
        private List<DistributionRequest> distributions;

        public Long getQuestionnaireId() { return questionnaireId; }
        public void setQuestionnaireId(Long questionnaireId) { this.questionnaireId = questionnaireId; }
        public List<DistributionRequest> getDistributions() { return distributions; }
        public void setDistributions(List<DistributionRequest> distributions) { this.distributions = distributions; }
    }
}
