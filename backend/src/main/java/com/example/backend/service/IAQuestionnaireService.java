package com.example.backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class IAQuestionnaireService {

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${ai.api-key:}")
    private String apiKey;

    @Value("${ai.api-url:}")
    private String apiUrl;

    @Value("${ai.model:llama-3.3-70b-versatile}")
    private String model;

    @Value("${ai.enabled:false}")
    private boolean aiEnabled;

    private static final String SYSTEM_PROMPT = """
        Tu es un expert senior en conception de questionnaires de satisfaction client pour une compagnie d'assurance.

        RÈGLES ABSOLUES :
        1. Questions courtes, directes, sans double négation, sans jargon
        2. Chaque question mesure UN SEUL concept
        3. Ton neutre et professionnel — jamais commercial ni biaisé
        4. Adapté au domaine assurance (contrats, sinistres, service, transparence)
        5. Max 15% de questions à texte libre dans un questionnaire
        6. Langue française simple, niveau grand public

        TYPES DE QUESTIONS :
        - text       : Question ouverte (commentaires libres) — max 15% du total
        - radio      : Choix unique — options TRANCHÉES, INTERDITE toute option neutre/modérée
        - checkbox   : Choix multiple — options variées et exhaustives
        - scale      : Échelle — DOIT TOUJOURS contenir une option neutre centrale (ex: "Parfois", "Neutre")
        - select     : Liste déroulante — options mutuellement exclusives

        DÉTECTION DE DOUBLONS (très stricte) :
        - Comparer le SENS, L'OBJECTIF et la SÉMANTIQUE, pas seulement le texte
        - Une reformulation différente de la même idée = doublon
        - Exemple : "Êtes-vous satisfait du service ?" ≈ "Comment évaluez-vous notre service ?" → doublon

        ORDRE DES QUESTIONS (automatique) :
        1. Introduction (objectif du questionnaire + confidentialité)
        2. Satisfaction globale (première impression, facilité)
        3. Expérience détaillée (service client, rapidité, clarté des contrats)
        4. Questions éthiques (confiance, transparence, données personnelles)
        5. Amélioration (problèmes rencontrés, suggestions)
        6. Informations générales (âge, type de contrat, ancienneté)
        7. Conclusion (recommandation, mot de fin)

        IMPORTANT : Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte autour.
        """;

    public IAQuestionnaireService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(30_000);
        this.restTemplate = new RestTemplate(factory);
    }

    private void validateConfig() {
        if (!aiEnabled) throw new RuntimeException("IA désactivée (ai.enabled=false)");
        if (apiKey == null || apiKey.isBlank() || apiKey.equalsIgnoreCase("YOUR_GROQ_API_KEY_HERE"))
            throw new RuntimeException("Clé API Groq non configurée — renseignez ai.api-key dans application.properties (obtenez-la gratuitement sur https://console.groq.com/keys)");
        if (apiUrl == null || apiUrl.isBlank())
            throw new RuntimeException("URL API non configurée — renseignez ai.api-url dans application.properties");
    }

    // ── Extract first JSON object or array from raw AI text ──
    private String extractJson(String raw) {
        if (raw == null) throw new RuntimeException("Réponse vide de l'IA");
        // Remove markdown fences
        String cleaned = raw.replaceAll("(?s)```json|```", "").trim();
        // Find first { or [
        int start = -1;
        char open = '{';
        for (int i = 0; i < cleaned.length(); i++) {
            char c = cleaned.charAt(i);
            if (c == '{' || c == '[') { start = i; open = c; break; }
        }
        if (start == -1) throw new RuntimeException("Aucun JSON trouvé dans la réponse IA : " + cleaned.substring(0, Math.min(200, cleaned.length())));
        char close = open == '{' ? '}' : ']';
        int depth = 0;
        for (int i = start; i < cleaned.length(); i++) {
            char c = cleaned.charAt(i);
            if (c == open) depth++;
            else if (c == close) { depth--; if (depth == 0) return cleaned.substring(start, i + 1); }
        }
        throw new RuntimeException("JSON mal formé dans la réponse IA");
    }

    // ── Main call to Groq (OpenAI-compatible) API ──
    public String callAI(String userMessage) {
        validateConfig();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                    Map.of("role", "system", "content", SYSTEM_PROMPT),
                    Map.of("role", "user", "content", userMessage)
                ),
                "temperature", 0.3,
                "max_tokens", 1000
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, request, Map.class);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices =
                (List<Map<String, Object>>) response.getBody().get("choices");
            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            String raw = (String) message.get("content");
            return extractJson(raw);

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Erreur appel IA : " + e.getMessage());
        }
    }

    public Map<String, Object> checkDoublon(String newTitre, String role, List<String> existingTitles) throws Exception {
        String prompt = """
            Analyse si la nouvelle question est un doublon sémantique des questions existantes.
            Critères de doublon (TRÈS STRICT) :
            - Même sujet ou même objectif de mesure → doublon même si formulé différemment
            - Même thème abordé sous un angle très proche → doublon
            - Exemple : "Êtes-vous satisfait ?" ≈ "Comment évaluez-vous notre service ?" → doublon
            - Seuil : similarité ≥ 0.65 → doublon = true

            Nouvelle question : "%s"
            Questions existantes : %s

            JSON uniquement : {"doublon": boolean, "questionSimilaire": {"titre": string, "similarite": number}, "message": string}
            Le message doit expliquer POURQUOI c'est un doublon en 1 phrase courte.
            """.formatted(newTitre, mapper.writeValueAsString(existingTitles));
        return mapper.readValue(callAI(prompt), Map.class);
    }

    public Map<String, Object> reformuler(String titre, String type) throws Exception {
        String prompt = """
            Tu reformules une question pour un questionnaire client d'assurance.
            Règles STRICTES :
            - Phrase courte, directe, vocabulaire simple (niveau lycée)
            - Commence par un verbe ou un pronom interrogatif
            - Pas de double négation, pas de jargon, pas d'ambiguïté
            - Garde exactement l'intention originale
            - L'explication doit tenir en 1 phrase max
            Question originale : "%s"
            Type : %s
            JSON uniquement : {"titreOriginal": string, "titreReformule": string, "explication": string}
            """.formatted(titre, type);
        return mapper.readValue(callAI(prompt), Map.class);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> reorderQuestions(List<Map<String, Object>> questions) throws Exception {
        String questionsJson = mapper.writeValueAsString(
            questions.stream().map(q -> Map.of(
                "id",    q.getOrDefault("id", 0),
                "titre", q.getOrDefault("titre", ""),
                "type",  q.getOrDefault("type", "text")
            )).toList()
        );
        String prompt = """
            Réordonne ces questions selon l'ordre logique d'un questionnaire d'assurance professionnel :
            %s

            ORDRE IMPOSÉ (du début à la fin) :
            1. Introduction (présentation de l'objectif, confidentialité)
            2. Satisfaction globale (première impression, facilité générale)
            3. Expérience détaillée (service client, rapidité, clarté des contrats)
            4. Questions éthiques (confiance, transparence, données personnelles)
            5. Amélioration (problèmes rencontrés, suggestions d'amélioration)
            6. Informations générales (âge, type de contrat, ancienneté)
            7. Conclusion (recommandation, commentaire final — questions ouvertes EN DERNIER)

            Règle absolue : les questions de type "text" (texte libre) vont toujours en dernière position.

            JSON uniquement : {"orderedIds": [id1, id2, ...]} — inclure TOUS les IDs reçus.
            """.formatted(questionsJson);

        String raw = callAI(prompt);
        Map<String, Object> result = mapper.readValue(raw, Map.class);
        List<Number> orderedIds = (List<Number>) result.get("orderedIds");

        Map<String, Map<String, Object>> byId = new java.util.LinkedHashMap<>();
        for (Map<String, Object> q : questions) {
            byId.put(String.valueOf(q.getOrDefault("id", "")), q);
        }
        List<Map<String, Object>> ordered = new ArrayList<>();
        for (Number id : orderedIds) {
            String key = String.valueOf(id.intValue());
            Map<String, Object> found = byId.remove(key);
            if (found != null) ordered.add(found);
        }
        ordered.addAll(byId.values());
        return ordered;
    }

    public Map<String, Object> validerChoix(String titre, String type, List<String> options) throws Exception {
        String typeRule = switch (type) {
            case "radio" -> """
                RÈGLE CRITIQUE (radio = choix unique) :
                - Options TRANCHÉES et DISTINCTES uniquement (ex: Oui / Non, Toujours / Jamais)
                - INTERDIT : toute option neutre, modérée ou ambiguë ("Peut-être", "Parfois", "Je ne sais pas", "Neutre")
                - Forcer un choix clair, sans échappatoire vers le milieu
                """;
            case "scale" -> """
                RÈGLE CRITIQUE (scale = échelle) :
                - Utiliser l'échelle standard : Toujours, Souvent, Parfois, Rarement, Jamais
                - "Parfois" est l'option neutre centrale OBLIGATOIRE
                - 5 options exactement, du plus positif au plus négatif
                """;
            case "checkbox" -> """
                RÈGLE (checkbox = choix multiple) :
                - Options variées et exhaustives couvrant tous les cas possibles
                - Inclure une option "Autre" si pertinent
                - 4 à 6 options maximum
                """;
            default -> "";
        };
        String prompt = """
            Génère des options optimales pour cette question : "%s" (type: %s)
            Options actuelles (peuvent être vides) : %s
            %s
            Règles communes : libellés courts (2-4 mots), français simple, mutuellement exclusifs.
            JSON uniquement : {"valide": bool, "problemes": [string], "optionsSuggerees": [string]}
            """.formatted(titre, type, mapper.writeValueAsString(options), typeRule);
        return mapper.readValue(callAI(prompt), Map.class);
    }

    public Map<String, Object> verifierCoherence(String newTitre, List<String> existingTitles) throws Exception {
        String prompt = """
            Analyse si cette nouvelle question est cohérente avec les questions existantes du même questionnaire.
            Une question est INCOHÉRENTE si :
            - Elle porte sur un domaine totalement différent (ex: question médicale dans un questionnaire satisfaction auto)
            - Elle change radicalement le sujet ou la cible du questionnaire
            - Elle n'a aucun rapport thématique avec les autres questions

            Une question EST cohérente si elle aborde un aspect complémentaire du même domaine.

            Nouvelle question : "%s"
            Questions existantes : %s

            JSON uniquement : {"coherente": boolean, "message": string, "conseil": string}
            message = 1 phrase expliquant pourquoi ce n'est pas cohérent (vide si cohérent)
            conseil = suggestion courte pour l'adapter (vide si cohérent)
            """.formatted(newTitre, mapper.writeValueAsString(existingTitles));
        return mapper.readValue(callAI(prompt), Map.class);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> reordonner(List<Map<String, Object>> questions) throws Exception {
        return reorderQuestions(questions);
    }
}
