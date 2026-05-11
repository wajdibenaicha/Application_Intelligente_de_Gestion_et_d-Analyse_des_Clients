package com.example.backend.service;

import com.example.backend.models.Reponse;
import com.example.backend.models.ClientKpi;
import com.example.backend.Repository.ReponseRepository;
import com.example.backend.Repository.ClientKpiRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class AnomalyService {

    @Value("${ml.service.url:http://localhost:5000}")
    private String mlUrl;

    @Autowired private ReponseRepository reponseRepo;
    @Autowired private ClientKpiRepository kpiRepo;

    private final RestTemplate rest;

    public AnomalyService() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(3_000);
        f.setReadTimeout(15_000);
        this.rest = new RestTemplate(f);
    }

    /**
     * Analyse les réponses d'un client à un questionnaire pour détecter une fraude.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> analyzeSubmission(Long clientId, Long questionnaireId) {
        List<Reponse> reponses = reponseRepo.findByClientIdAndQuestionnaireId(clientId, questionnaireId);

        if (reponses.isEmpty()) {
            return Map.of("is_anomaly", false, "risk_level", "NONE",
                          "reasons", List.of(), "error", "Aucune réponse trouvée");
        }

        // KPI score de cette soumission
        double kpiScore = kpiRepo.findByClientIdAndQuestionnaireId(clientId, questionnaireId)
            .stream().mapToDouble(ClientKpi::getScore).average().orElse(50.0);

        // Construire la liste des réponses pour Flask
        List<Map<String, Object>> responseList = new ArrayList<>();
        for (Reponse r : reponses) {
            Map<String, Object> item = new HashMap<>();
            item.put("question_type", r.getQuestion().getType());
            item.put("value",         r.getReponse() != null ? r.getReponse() : "");
            responseList.add(item);
        }

        Map<String, Object> body = Map.of(
            "client_id",        clientId,
            "questionnaire_id", questionnaireId,
            "kpi_score",        kpiScore,
            "responses",        responseList
        );

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> resp = rest.postForEntity(mlUrl + "/predict/anomaly", entity, Map.class);
            return resp.getBody() != null ? resp.getBody() : fallback();
        } catch (Exception e) {
            return fallback();
        }
    }

    /**
     * Analyse en lot toutes les soumissions d'un questionnaire.
     */
    public List<Map<String, Object>> analyzeQuestionnaire(Long questionnaireId) {
        List<Reponse> all = reponseRepo.findByQuestionnaireId(questionnaireId);
        Set<Long> clientIds = new HashSet<>();
        all.forEach(r -> { if (r.getClient() != null) clientIds.add(r.getClient().getId()); });

        List<Map<String, Object>> results = new ArrayList<>();
        for (Long clientId : clientIds) {
            Map<String, Object> result = new HashMap<>(analyzeSubmission(clientId, questionnaireId));
            result.put("client_id", clientId);
            results.add(result);
        }
        return results;
    }

    private Map<String, Object> fallback() {
        return Map.of("is_anomaly", false, "risk_level", "NONE",
                      "reasons", List.of(), "fallback", true);
    }
}
