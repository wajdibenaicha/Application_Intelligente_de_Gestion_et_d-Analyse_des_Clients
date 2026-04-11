package com.example.backend.service;

import com.example.backend.models.*;
import com.example.backend.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

@Service
public class KpiCalculatorService {

    @Autowired private ReponseRepository reponseRepository;
    @Autowired private ClientKpiRepository clientKpiRepository;

    private static final Set<String> POSITIVE_WORDS = Set.of(
        "excellent", "bien", "satisfait", "content", "super",
        "parfait", "merci", "good", "great", "happy",
        "recommend", "love", "best", "amazing", "fantastic"
    );
        private static final Set<String> NEGATIVE_WORDS = Set.of(
        "mauvais", "terrible", "insatisfait", "nul", "horrible",
        "probleme", "bad", "worst", "hate", "poor",
        "disappointed", "awful", "never", "complaint"
    );

    public ClientKpi calculateKpi(Long clientId, Long questionnaireId) {
        List<Reponse> responses = reponseRepository
            .findByClientIdAndQuestionnaireId(clientId, questionnaireId);
        if (responses.isEmpty()) return null;

        double totalScore = 0;
        int count = 0;
        List<Map<String, Object>> breakdown = new ArrayList<>();

        for (Reponse r : responses) {
            double qScore = scoreResponse(r);
            totalScore += qScore;
            count++;
            breakdown.add(Map.of(
                "questionId", r.getQuestion().getId(),
                "response", r.getReponse(),
                "score", qScore
            ));
        }

        double finalScore = count > 0 ? totalScore / count : 0;
        Sentiment sentiment = Sentiment.fromScore(finalScore);

        ClientKpi kpi = new ClientKpi();
        kpi.setClient(responses.get(0).getClient());
        kpi.setQuestionnaire(responses.get(0).getQuestionnaire());
        kpi.setScore(Math.round(finalScore * 100.0) / 100.0);
        kpi.setSentiment(sentiment);
        try {
            kpi.setDetails(new ObjectMapper().writeValueAsString(breakdown));
        } catch (Exception e) { kpi.setDetails("[]"); }

        return clientKpiRepository.save(kpi);
    }

    private double scoreResponse(Reponse r) {
        String value = r.getReponse().trim().toLowerCase();

        
        try {
            double num = Double.parseDouble(value);
            if (num >= 1 && num <= 5) return (num - 1) / 4.0 * 100;
            if (num >= 1 && num <= 10) return (num - 1) / 9.0 * 100;
        } catch (NumberFormatException ignored) {}

        
        if (value.equals("oui") || value.equals("yes")) return 100;
        if (value.equals("non") || value.equals("no")) return 0;

        
        return switch (value) {
            case "tres satisfait", "very satisfied" -> 100;
            case "satisfait", "satisfied" -> 75;
            case "neutre", "neutral" -> 50;
            case "insatisfait", "dissatisfied" -> 25;
            case "tres insatisfait", "very dissatisfied" -> 0;
            default -> analyzeText(value);
        };
    }

    private double analyzeText(String text) {
        String[] words = text.split("\\W+");
        int pos = 0, neg = 0;
        for (String w : words) {
                        if (POSITIVE_WORDS.contains(w)) pos++;
            if (NEGATIVE_WORDS.contains(w)) neg++;
        }
        if (pos + neg == 0) return 50;
        return ((double) pos / (pos + neg)) * 100;
    }

}