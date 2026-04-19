package com.example.backend.service;

import com.example.backend.models.*;
import com.example.backend.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.Year;
import java.util.*;

@Service
public class KpiCalculatorService {

    @Autowired private ReponseRepository reponseRepository;
    @Autowired private ClientKpiRepository clientKpiRepository;
    @Autowired private com.example.backend.Repository.ClientRepository clientRepository;

    // ── Weights ────────────────────────────────────────────────────
    private static final double W_SURVEY     = 0.50;
    private static final double W_SENIORITY  = 0.20;
    private static final double W_PREMIUM    = 0.15;
    private static final double W_AGE        = 0.10;
    private static final double W_CONTRACT   = 0.05;

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

        Client client = responses.get(0).getClient();

        // ── 1. Survey score (50%) ──────────────────────────────────
        double surveyTotal = 0;
        List<Map<String, Object>> breakdown = new ArrayList<>();
        for (Reponse r : responses) {
            double qScore = scoreResponse(r);
            surveyTotal += qScore;
            breakdown.add(Map.of(
                "questionId", r.getQuestion().getId(),
                "response",   r.getReponse(),
                "score",      qScore
            ));
        }
        double surveyScore = responses.isEmpty() ? 50 : surveyTotal / responses.size();

        // ── 2. Seniority score (20%) ───────────────────────────────
        double seniorityScore = scoreSeniority(client.getAnneeInscription());

        // ── 3. Annual premium score (15%) ──────────────────────────
        double premiumScore = scorePremium(client.getPrimeAnnuelle());

        // ── 4. Age score (10%) ────────────────────────────────────
        double ageScore = scoreAge(client.getDateNaissance());

        // ── 5. Contract type score (5%) ───────────────────────────
        double contractScore = scoreContract(client.getTypeContrat());

        // ── Final weighted score ──────────────────────────────────
        double finalScore =
            surveyScore    * W_SURVEY    +
            seniorityScore * W_SENIORITY +
            premiumScore   * W_PREMIUM   +
            ageScore       * W_AGE       +
            contractScore  * W_CONTRACT;

        finalScore = Math.min(100, Math.max(0, finalScore));
        Sentiment sentiment = Sentiment.fromScore(finalScore);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("surveyScore",    Math.round(surveyScore    * 100.0) / 100.0);
        details.put("seniorityScore", Math.round(seniorityScore * 100.0) / 100.0);
        details.put("premiumScore",   Math.round(premiumScore   * 100.0) / 100.0);
        details.put("ageScore",       Math.round(ageScore       * 100.0) / 100.0);
        details.put("contractScore",  Math.round(contractScore  * 100.0) / 100.0);
        details.put("responses",      breakdown);

        ClientKpi kpi = new ClientKpi();
        kpi.setClient(client);
        kpi.setQuestionnaire(responses.get(0).getQuestionnaire());
        kpi.setScore(Math.round(finalScore * 100.0) / 100.0);
        kpi.setSentiment(sentiment);
        try {
            kpi.setDetails(new ObjectMapper().writeValueAsString(details));
        } catch (Exception e) { kpi.setDetails("{}"); }

        return clientKpiRepository.save(kpi);
    }

    public ClientKpi calculateGlobalKpi(Long clientId) {
        List<Reponse> responses = reponseRepository.findByClientId(clientId);
        if (responses.isEmpty()) return null;

        Client client = responses.get(0).getClient();

        double surveyTotal = 0;
        List<Map<String, Object>> breakdown = new ArrayList<>();
        for (Reponse r : responses) {
            double qScore = scoreResponse(r);
            surveyTotal += qScore;
            breakdown.add(Map.of(
                "questionId", r.getQuestion().getId(),
                "questionnaire", r.getQuestionnaire() != null ? r.getQuestionnaire().getTitre() : "",
                "response", r.getReponse(),
                "score", qScore
            ));
        }
        double surveyScore = surveyTotal / responses.size();

        double seniorityScore = scoreSeniority(client.getAnneeInscription());
        double premiumScore   = scorePremium(client.getPrimeAnnuelle());
        double ageScore       = scoreAge(client.getDateNaissance());
        double contractScore  = scoreContract(client.getTypeContrat());

        double finalScore =
            surveyScore    * W_SURVEY    +
            seniorityScore * W_SENIORITY +
            premiumScore   * W_PREMIUM   +
            ageScore       * W_AGE       +
            contractScore  * W_CONTRACT;

        finalScore = Math.min(100, Math.max(0, finalScore));
        Sentiment sentiment = Sentiment.fromScore(finalScore);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("global", true);
        details.put("questionnaireCount", responses.stream().map(r -> r.getQuestionnaire() != null ? r.getQuestionnaire().getId() : null).distinct().count());
        details.put("surveyScore",    Math.round(surveyScore    * 100.0) / 100.0);
        details.put("seniorityScore", Math.round(seniorityScore * 100.0) / 100.0);
        details.put("premiumScore",   Math.round(premiumScore   * 100.0) / 100.0);
        details.put("ageScore",       Math.round(ageScore       * 100.0) / 100.0);
        details.put("contractScore",  Math.round(contractScore  * 100.0) / 100.0);
        details.put("responses",      breakdown);

        ClientKpi kpi = new ClientKpi();
        kpi.setClient(client);
        kpi.setQuestionnaire(null);
        kpi.setScore(Math.round(finalScore * 100.0) / 100.0);
        kpi.setSentiment(sentiment);
        try { kpi.setDetails(new ObjectMapper().writeValueAsString(details)); }
        catch (Exception e) { kpi.setDetails("{}"); }

        return clientKpiRepository.save(kpi);
    }

    // ── Seniority: years since anneeInscription ──────────────────
    private double scoreSeniority(Integer anneeInscription) {
        if (anneeInscription == null) return 50;
        int years = Year.now().getValue() - anneeInscription;
        if (years < 1)  return 20;
        if (years < 4)  return 40;
        if (years < 8)  return 70;
        if (years < 15) return 85;
        return 100;
    }

    // ── Annual premium ───────────────────────────────────────────
    private double scorePremium(Double prime) {
        if (prime == null) return 40;
        if (prime < 300)  return 10;
        if (prime < 800)  return 30;
        if (prime < 1500) return 55;
        if (prime < 3000) return 75;
        return 100;
    }

    // ── Age from dateNaissance ───────────────────────────────────
    private double scoreAge(LocalDate dateNaissance) {
        if (dateNaissance == null) return 60;
        int age = LocalDate.now().getYear() - dateNaissance.getYear();
        if (age < 26) return 40;
        if (age < 36) return 65;
        if (age < 51) return 80;
        if (age < 66) return 90;
        return 70;
    }

    // ── Contract type ────────────────────────────────────────────
    private double scoreContract(String typeContrat) {
        if (typeContrat == null) return 30;
        return switch (typeContrat.trim().toUpperCase()) {
            case "VIE"                   -> 100;
            case "HABITATION", "AUTO"    -> 60;
            case "SANTE"                 -> 75;
            case "VOYAGE"                -> 50;
            case "GENERAL"               -> 45;
            default                      -> 35;
        };
    }

    // ── Survey response scoring ──────────────────────────────────
    private double scoreResponse(Reponse r) {
        String value = r.getReponse().trim().toLowerCase();

        try {
            double num = Double.parseDouble(value);
            if (num >= 1 && num <= 5)  return (num - 1) / 4.0 * 100;
            if (num >= 1 && num <= 10) return (num - 1) / 9.0 * 100;
        } catch (NumberFormatException ignored) {}

        if (value.equals("oui") || value.equals("yes")) return 100;
        if (value.equals("non") || value.equals("no"))  return 0;

        return switch (value) {
            case "tres satisfait", "very satisfied"     -> 100;
            case "satisfait", "satisfied"               -> 75;
            case "neutre", "neutral"                    -> 50;
            case "insatisfait", "dissatisfied"          -> 25;
            case "tres insatisfait", "very dissatisfied"-> 0;
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
