package com.example.backend.controller;

import com.example.backend.models.Client;
import com.example.backend.service.EnvoiService;
import com.example.backend.service.QuestionnaireDistributionService;
import com.example.backend.service.QuestionnaireDistributionService.DistributionRequest;
import com.example.backend.Repository.ClientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/envoi")
@CrossOrigin(origins = "http://localhost:4200")
public class EnvoiController {
    @Autowired
    private EnvoiService envoiService;
    @Autowired
    private ClientRepository clientRepository;
    @Autowired
    private QuestionnaireDistributionService distributionService;

    @GetMapping("/clients")
    public List<Client> filtrerClients(@RequestParam(required = false) String typeContrat,
            @RequestParam(required = false) Integer anneeMin,
            @RequestParam(required = false) String profession) {
        return envoiService.filtrerClients(typeContrat, anneeMin, profession);
    }

    @PostMapping("/generer-lien")
    public String genererLien(@RequestParam Long questionnaireId, @RequestParam Long clientId) {
        return envoiService.genererLienChiffre(questionnaireId, clientId);
    }
   @PostMapping("/distribuer")
public ResponseEntity<?> distribuer(
        @RequestBody DistributePayload payload) {
    distributionService.distribute(
        payload.getQuestionnaireId(),
        payload.getDistributions());
    return ResponseEntity.ok(
        Map.of("message", "Sent successfully"));
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