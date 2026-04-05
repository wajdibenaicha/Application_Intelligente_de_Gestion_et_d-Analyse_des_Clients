package com.example.backend.controller;

import com.example.backend.models.*;
import com.example.backend.Repository.*;
import com.example.backend.service.TokenEncryptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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
        try {
            long[] ids = decryptIds(token);
            Long qId = ids[0], clientId = ids[1];

            EnvoiQuestionnaire envoi = envoiRepo
                .findFirstByQuestionnaireIdAndClientIdAndReponduFalse(qId, clientId)
                .orElse(null);

            if (envoi == null)
                return ResponseEntity.badRequest().body(Map.of("error", "Ce lien a déjà été utilisé ou est invalide."));

            return ResponseEntity.ok(qRepo.findById(qId).orElseThrow());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Lien invalide ou expiré."));
        }
    }

    // No @Transactional — avoids "marked as rollback-only" when inner JPA call fails
    @PostMapping("/questionnaire/submit")
    public ResponseEntity<?> submit(@RequestBody SubmitRequest request) {
        long[] ids;
        try {
            ids = decryptIds(request.getToken());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lien invalide."));
        }

        Long qId = ids[0], clientId = ids[1];

        EnvoiQuestionnaire envoi = envoiRepo
            .findFirstByQuestionnaireIdAndClientIdAndReponduFalse(qId, clientId)
            .orElse(null);

        if (envoi == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Ce lien a déjà été utilisé."));

        Client client = clientRepo.findById(clientId).orElse(null);
        Questionnaire q = qRepo.findById(qId).orElse(null);

        if (client == null || q == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Données introuvables."));

        for (AnswerItem a : request.getResponses()) {
            Question question = questionRepo.findById(a.getQuestionId()).orElse(null);
            if (question == null) continue; // skip unknown questions gracefully
            Reponse r = new Reponse();
            r.setClient(client);
            r.setQuestionnaire(q);
            r.setQuestion(question);
            r.setReponse(a.getAnswer());
            reponseRepo.save(r);
        }

        envoi.setRepondu(true);
        envoiRepo.save(envoi);

        return ResponseEntity.ok(Map.of("message", "Merci pour vos réponses !"));
    }

    private long[] decryptIds(String token) {
        String decrypted = tokenService.decrypt(token);
        String[] parts = decrypted.split(":");
        return new long[]{ Long.parseLong(parts[0]), Long.parseLong(parts[1]) };
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
