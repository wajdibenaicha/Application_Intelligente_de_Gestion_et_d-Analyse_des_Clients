package com.example.backend.controller;

import com.example.backend.models.*;
import com.example.backend.Repository.*;
import com.example.backend.service.TokenEncryptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
@CrossOrigin(origins = "http://localhost:4200")
public class PublicQuestionnaireController {

    @Autowired private TokenEncryptionService tokenService;
    @Autowired private EnvoiQuestionnaireRepository envoiRepo;
    @Autowired private QuestionnaireRepository qRepo;
    @Autowired private QuestionRepository questionRepo;
    @Autowired private ReponseRepository reponseRepo;
    @Autowired private ClientRepository clientRepo;

    @GetMapping("/questionnaire")
    public ResponseEntity<?> getByToken(@RequestParam String token) {
        String decrypted = tokenService.decrypt(token);
        String[] parts = decrypted.split(":");
        Long qId = Long.parseLong(parts[0]);
        Long clientId = Long.parseLong(parts[1]);

        EnvoiQuestionnaire envoi = envoiRepo.findByToken(token).orElse(null);

        if (envoi == null)
            return ResponseEntity.status(404).body(Map.of("error", "Lien invalide"));
        if (envoi.isRepondu())
            return ResponseEntity.badRequest().body(Map.of("error", "Deja rempli"));

        return ResponseEntity.ok(qRepo.findById(qId).orElseThrow());
    }

    @PostMapping("/questionnaire/submit")
    @Transactional
    public ResponseEntity<?> submit(@RequestBody SubmitRequest request) {
        String decrypted = tokenService.decrypt(request.getToken());
        String[] parts = decrypted.split(":");
        Long qId = Long.parseLong(parts[0]);
        Long clientId = Long.parseLong(parts[1]);

        EnvoiQuestionnaire envoi = envoiRepo.findByToken(request.getToken()).orElse(null);
        if (envoi == null || envoi.isRepondu())
            return ResponseEntity.badRequest().body("Invalid or already used");

        Client client = clientRepo.findById(clientId).orElseThrow();
        Questionnaire q = qRepo.findById(qId).orElseThrow();

        for (var a : request.getResponses()) {
            Reponse r = new Reponse();
            r.setClient(client);
            r.setQuestionnaire(q);
            r.setQuestion(questionRepo.findById(a.getQuestionId()).orElseThrow());
            r.setReponse(a.getAnswer());
            reponseRepo.save(r);
        }

        envoi.setRepondu(true);
        envoiRepo.save(envoi);

        return ResponseEntity.ok(Map.of("message", "Merci !"));
    }

    
    static class SubmitRequest {
        private String token;
        private List<AnswerItem> responses;
        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }
        public List<AnswerItem> getResponses() { return responses; }
        public void setResponses(List<AnswerItem> responses) { this.responses = responses; }
    }

    static class AnswerItem {
        private Long questionId;
        private String answer;
        public Long getQuestionId() { return questionId; }
        public void setQuestionId(Long questionId) { this.questionId = questionId; }
        public String getAnswer() { return answer; }
        public void setAnswer(String answer) { this.answer = answer; }
    }
}