package com.example.backend.service;

import com.example.backend.models.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Service
public class AiAnalysisService {

    @Value("${ai.enabled:false}")
    private boolean aiEnabled;

    @Value("${ai.api-key:}")
    private String apiKey;

    @Value("${ai.api-url:}")
    private String apiUrl;

    @Value("${ai.model:gpt-3.5-turbo}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> analyzeAndRecommend(
            ClientKpi kpi,
            List<Reponse> responses,
            List<Offre> availableOffres) {

        if (!aiEnabled || apiKey.isBlank()) return null;

        String prompt = buildPrompt(kpi, responses, availableOffres);

        Map<String, Object> body = Map.of(
            "model", model,
            "messages", List.of(
                Map.of("role", "system", "content",
                    "Tu es un analyste CRM. Analyse les réponses " +
                    "et recommande la meilleure offre. " +
                    "Réponds en JSON: {offreId: number, reason: string}"),
                Map.of("role", "user", "content", prompt)
            ),
            "temperature", 0.3
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<Map> res = restTemplate.exchange(
            apiUrl, HttpMethod.POST,
            new HttpEntity<>(body, headers), Map.class);

        return res.getBody();
    }

    private String buildPrompt(ClientKpi kpi,
            List<Reponse> responses, List<Offre> offres) {
        StringBuilder sb = new StringBuilder();
        sb.append("Score KPI: ").append(kpi.getScore())
          .append("/100 (").append(kpi.getSentiment()).append(")\n\n");
        sb.append("=== RÉPONSES CLIENT ===\n");
        for (Reponse r : responses) {
            sb.append("Q: ").append(r.getQuestion().getTitre())
              .append("\nR: ").append(r.getReponse()).append("\n\n");
        }
        sb.append("=== OFFRES DISPONIBLES ===\n");
        for (Offre o : offres) {
            sb.append("ID:").append(o.getId())
              .append(" | ").append(o.getTitle())
              .append(" | Cat:").append(o.getCategorie())
              .append(" | ").append(o.getDescription()).append("\n");
        }
        sb.append("\nQuelle offre correspond le mieux ? JSON: {offreId, reason}");
        return sb.toString();
    }
}
