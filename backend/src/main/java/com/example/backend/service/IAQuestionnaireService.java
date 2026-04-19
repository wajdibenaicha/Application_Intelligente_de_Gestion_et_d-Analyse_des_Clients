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
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(60_000);
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
    public String callAI(String userMessage) throws Exception {
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
            Analyse si la nouvelle question est un VRAI doublon sémantique d'une question existante.
            Un vrai doublon = même objectif de mesure ET même sujet précis.
            Ce N'EST PAS un doublon si les questions abordent des sujets distincts même si elles partagent une structure grammaticale similaire.

            Exemples de VRAIS doublons (similarité >= 0.85) :
            - "Êtes-vous satisfait ?" ≈ "Comment évaluez-vous notre service ?" → doublon (même mesure)
            - "Quel canal préférez-vous ?" ≈ "Comment souhaitez-vous être contacté ?" → doublon (même sujet)

            Exemples de FAUX doublons (à rejeter) :
            - "Quelles fonctionnalités souhaitez-vous ?" vs "Quelles informations avez-vous reçues sur vos données ?" → sujets totalement différents, pas un doublon
            - "Êtes-vous satisfait du produit ?" vs "Recommanderiez-vous le produit ?" → mesurent des choses différentes

            Seuil strict : doublon = true UNIQUEMENT si similarité >= 0.85 ET même sujet précis.

            Nouvelle question : "%s"
            Questions existantes : %s

            JSON uniquement : {"doublon": boolean, "questionSimilaire": {"titre": string, "similarite": number}, "message": string}
            """.formatted(newTitre, mapper.writeValueAsString(existingTitles));
        return mapper.readValue(callAI(prompt), Map.class);
    }

    public Map<String, Object> reformuler(String titre, String type) throws Exception {
        String prompt = """
            Corrige et améliore cette question pour un questionnaire client d'assurance.
            Question : "%s"
            Type : %s
            Règles : corrige les fautes, remplace "avec nous/chez nous" par "avec notre compagnie d'assurance", rends la question plus précise et professionnelle.
            La reformulation doit toujours être différente et meilleure.
            Exemples : "êtes-vous avec nous ?" -> "êtes-vous client de notre compagnie ?", "vous etez satisfait ?" -> "Êtes-vous satisfait de nos services ?"
            JSON uniquement : {"titreOriginal": string, "titreReformule": string, "explication": string, "needsImprovement": boolean}
            needsImprovement = true si la question avait des fautes ou était vague.
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
            Tu analyses un questionnaire de satisfaction client pour une compagnie d'assurance.
            La nouvelle question est-elle cohérente avec les questions existantes ?

            Nouvelle question : "%s"
            Questions existantes : %s

            Dans un questionnaire assurance, les thèmes suivants sont TOUJOURS cohérents ensemble :
            satisfaction générale, service client, sinistres, remboursements, contrats, transparence,
            ancienneté, fidélité, recommandation, amélioration, informations générales du client.

            coherente = false UNIQUEMENT si la nouvelle question porte sur un domaine SANS AUCUN RAPPORT
            avec l'assurance ou la relation client (ex: une question sur la santé dans un questionnaire auto,
            une question RH interne dans un questionnaire client).
            Par défaut, si tu as le moindre doute : coherente = true.

            JSON uniquement : {"coherente": boolean, "message": string, "conseil": string}
            message = 1 phrase si incohérent (vide si cohérent)
            conseil = suggestion courte si incohérent (vide si cohérent)
            """.formatted(newTitre, mapper.writeValueAsString(existingTitles));
        return mapper.readValue(callAI(prompt), Map.class);
    }

    public Map<String, Object> verifierType(String titre, String type) throws Exception {
        String prompt = """
            Vérifie strictement si le type de question correspond au contenu de la question.

            Question : "%s"
            Type sélectionné : "%s"

            Définitions STRICTES des types :
            - text    : Question ouverte → réponse libre (commentaire, description, explication, nom, adresse)
            - radio   : Choix unique tranché → Oui/Non, binaire, une seule option parmi une liste courte
            - checkbox: Choix multiple → l'utilisateur peut cocher plusieurs éléments d'une liste
            - scale   : Échelle de FRÉQUENCE ou d'INTENSITÉ UNIQUEMENT → (Toujours/Jamais, Très satisfait/Très insatisfait)
                        N'est PAS adapté pour : durées, dates, données personnelles, choix de catégories
            - select  : Liste déroulante → choisir UNE catégorie, une période, un type parmi plusieurs options

            Incompatibilités CRITIQUES (retourner compatible: false) :
            - Question de DURÉE (depuis combien de temps, depuis quand, combien d'années) + type "scale" → incompatible, utiliser "select"
            - Question ouverte (quel est, décrivez, expliquez, votre nom) + type autre que "text" → incompatible
            - Question à choix multiple évident (choisissez plusieurs, quels services) + type "radio" → incompatible
            - Question Oui/Non ou binaire + type "text" ou "scale" → incompatible

            JSON uniquement : {"compatible": boolean, "message": string, "typeRecommande": string}
            message = 1 phrase courte expliquant l'incompatibilité (chaîne vide si compatible)
            typeRecommande = type le mieux adapté parmi [text, radio, checkbox, scale, select] (chaîne vide si compatible)
            """.formatted(titre, type);
        return mapper.readValue(callAI(prompt), Map.class);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> analyserQuestion(String titre, String type, List<String> existingTitles, List<String> selectedTitles) throws Exception {
        String existing = (existingTitles != null && !existingTitles.isEmpty())
            ? mapper.writeValueAsString(existingTitles) : "[]";
        String selected = (selectedTitles != null && selectedTitles.size() >= 2)
            ? mapper.writeValueAsString(selectedTitles) : "[]";

        String prompt = String.format(
            "Analyse cette question pour un questionnaire satisfaction client assurance.\n" +
            "Question: \"%s\"\nType: %s\nQuestions existantes: %s\nQuestions selectionnees: %s\n\n" +
            "Retourne UNIQUEMENT ce JSON valide, aucun texte avant ou apres:\n" +
            "{\n" +
            "  \"titreReformule\": \"question corrigee et amelioree (TOUJOURS differente et plus professionnelle)\",\n" +
            "  \"reformuleExplication\": \"ce qui a ete ameliore en une phrase\",\n" +
            "  \"needsImprovement\": true,\n" +
            "  \"typeCompatible\": true,\n" +
            "  \"typeMessage\": \"explication si incompatible sinon vide\",\n" +
            "  \"typeRecommande\": \"type recommande si incompatible sinon vide\",\n" +
            "  \"doublon\": false,\n" +
            "  \"doublonTitre\": \"titre similaire ou vide\",\n" +
            "  \"doublonSimilarite\": 0.0,\n" +
            "  \"doublonMessage\": \"explication ou vide\",\n" +
            "  \"coherente\": true,\n" +
            "  \"coherenceMessage\": \"explication si incoherent sinon vide\",\n" +
            "  \"conseil\": \"conseil si incoherent sinon vide\",\n" +
            "  \"options\": []\n" +
            "}\n\n" +
            "Regles:\n" +
            "- titreReformule: corrige fautes, remplace 'avec nous/chez nous' par 'avec notre compagnie d assurance', rends plus professionnel\n" +
            "- needsImprovement: true si la question avait des fautes ou etait vague/informelle\n" +
            "- typeCompatible: false si question de duree + scale, question ouverte + radio/scale, choix multiple + radio\n" +
            "- scale valide UNIQUEMENT pour frequence/intensite (Toujours/Jamais), PAS pour durees ou donnees personnelles\n" +
            "- doublon: true UNIQUEMENT si similarite semantique >= 0.85 ET meme objectif de mesure exact. En cas de doute, doublon = false\n" +
            "- coherente: false si la question n a aucun rapport avec les questions selectionnees (ignorer si liste vide)\n" +
            "- options: pour scale retourne [\"Toujours\",\"Souvent\",\"Parfois\",\"Rarement\",\"Jamais\"], pour text retourne [], pour autres types retourne 4-5 options adaptees",
            titre, type, existing, selected
        );

        return mapper.readValue(callAI(prompt), Map.class);
    }

    public Map<String, Object> verifierEnsemble(List<String> questions) throws Exception {
        String prompt = """
            Tu analyses un questionnaire de satisfaction client pour une compagnie d'assurance.
            Ces questions appartiennent-elles au MÊME questionnaire ?

            Questions : %s

            RÈGLE TRÈS IMPORTANTE : dans un questionnaire assurance, les thèmes suivants sont TOUJOURS compatibles entre eux :
            - Satisfaction générale / expérience globale
            - Contact avec le service client / support
            - Clarté des contrats / transparence
            - Ancienneté / durée de la relation client / type de contrat
            - Recommandation / fidélité
            - Sinistres / remboursements
            - Amélioration / suggestions
            - Informations générales (profession, âge, type de contrat)

            compatible = false UNIQUEMENT si les questions mélangent des domaines SANS AUCUN RAPPORT avec l'assurance ou la relation client.
            Exemples d'incompatibilité RÉELLE : questions médicales + satisfaction auto, ressources humaines internes + satisfaction client.

            Par défaut, si tu as le moindre doute : compatible = true.

            JSON uniquement :
            {
              "compatible": boolean,
              "message": "explication courte si incompatible, sinon vide",
              "groupes": [{"theme": "nom du thème", "questions": ["question1", "question2"]}]
            }
            groupes = groupes thématiques détectés (toujours remplir).
            """.formatted(mapper.writeValueAsString(questions));
        return mapper.readValue(callAI(prompt), Map.class);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> reordonner(List<Map<String, Object>> questions) throws Exception {
        return reorderQuestions(questions);
    }

    public Map<String, Object> evaluerOffre(String titre, String description, String categorie) throws Exception {
        String prompt = """
            Tu es un expert en assurance. Analyse cette offre d'assurance.

            Offre :
            - Titre : "%s"
            - Description : "%s"
            - Catégorie : "%s"

            ÉTAPE 1 — Cohérence : vérifie si le titre et la description décrivent bien la même offre, ET si la catégorie est compatible.
            RÈGLES STRICTES :
            - La catégorie GENERAL est TOUJOURS cohérente avec n'importe quel contenu — ne jamais la signaler comme incohérente.
            - coherent = false UNIQUEMENT si : le titre et la description parlent de sujets clairement différents entre eux, OU si une catégorie spécifique (SANTE/AUTO/HABITATION/VIE/VOYAGE) est utilisée mais le contenu appartient clairement à une AUTRE catégorie spécifique.
            - coherent = true si le contenu est globalement cohérent, même approximativement, ou si la catégorie est GENERAL.

            ÉTAPE 2 — Si cohérent, détermine le scoreMin et scoreMax (0-100) représentant le profil KPI idéal des clients cibles.
            - Offre premium/fidélité → scoreMin=60, scoreMax=100
            - Offre bienvenue/nouveaux clients → scoreMin=0, scoreMax=40
            - Offre standard → scoreMin=30, scoreMax=70
            - Offre tous clients → scoreMin=0, scoreMax=100

            Catégories disponibles : GENERAL, SANTE, AUTO, HABITATION, VIE, VOYAGE.

            JSON uniquement (pas de texte autour) :
            {
              "coherent": boolean,
              "coherenceMessage": "explication courte si non cohérent, sinon null",
              "categorieSuggeree": "la catégorie idéale parmi GENERAL/SANTE/AUTO/HABITATION/VIE/VOYAGE si non cohérent, sinon null",
              "titreSuggere": "titre corrigé et cohérent si non cohérent, sinon null",
              "descriptionSugeree": "description corrigée et cohérente si non cohérent, sinon null",
              "scoreMin": number or null,
              "scoreMax": number or null,
              "explication": "une phrase expliquant le ciblage, ou null si non cohérent"
            }
            """.formatted(titre, description, categorie);
        return mapper.readValue(callAI(prompt), Map.class);
    }

    public Map<String, Object> genererMessage(String type, String channel, String titre, String description) throws Exception {
        boolean isEmail = "email".equalsIgnoreCase(channel);
        boolean isOffre = "offre".equalsIgnoreCase(type);

        String prompt = isEmail ? """
            Tu es un expert en communication client pour une compagnie d'assurance tunisienne (STAR Assurances).
            Rédige un email professionnel, chaleureux et personnalisé pour envoyer %s à un client.
            Utilise {NOM_CLIENT} comme placeholder pour le nom du client.

            %s :
            - Titre : "%s"
            %s

            Règles :
            - Objet court et accrocheur (max 80 caractères)
            - Corps : 3-5 phrases, ton professionnel mais humain, pas de jargon excessif
            - Mentionne le nom du client avec {NOM_CLIENT}
            - Signe avec "Cordialement, L'équipe STAR Assurances"
            - Langue française

            JSON uniquement :
            {
              "sujet": "objet de l'email",
              "corps": "corps complet de l'email"
            }
            """.formatted(
                isOffre ? "une offre personnalisée" : "un questionnaire de satisfaction",
                isOffre ? "Offre" : "Questionnaire",
                titre,
                isOffre && description != null ? "- Description : \"" + description + "\"" : ""
            )
        : """
            Tu es un expert en communication client pour une compagnie d'assurance tunisienne (STAR Assurances).
            Rédige un SMS court et professionnel pour envoyer %s à un client.
            Utilise {NOM_CLIENT} comme placeholder pour le nom du client.

            %s :
            - Titre : "%s"
            %s

            Règles :
            - Max 160 caractères (SMS standard)
            - Ton direct, professionnel et bienveillant
            - Mentionne {NOM_CLIENT}
            - Pas de liens (le lien sera ajouté automatiquement)
            - Langue française

            JSON uniquement :
            {
              "sujet": null,
              "corps": "texte du SMS (max 160 caractères, sans lien)"
            }
            """.formatted(
                isOffre ? "une offre personnalisée" : "un questionnaire de satisfaction",
                isOffre ? "Offre" : "Questionnaire",
                titre,
                isOffre && description != null ? "- Description : \"" + description + "\"" : ""
            );

        return mapper.readValue(callAI(prompt), Map.class);
    }

    public Map<String, Object> verifierDoublonQuestionnaire(String titre, String description, List<String> existingTitles) throws Exception {
        String prompt = """
            Tu vérifies si un nouveau questionnaire est un doublon d'un questionnaire existant pour un gestionnaire d'assurance.

            Nouveau questionnaire :
            - Titre : "%s"
            - Description : "%s"

            Questionnaires existants du même gestionnaire : %s

            RÈGLE : doublon = true si le titre du nouveau questionnaire a une similarité thématique >= 0.50 avec un titre existant.
            Cela inclut les reformulations, synonymes, et questionnaires couvrant le même sujet général.

            Exemples de VRAIS doublons (similarité >= 0.50) :
            - "Satisfaction client 2024" ≈ "Évaluation de la satisfaction des clients" → doublon
            - "Questionnaire sinistres" ≈ "Enquête sur les sinistres auto" → doublon

            Exemples de NON-doublons :
            - "Satisfaction service client" vs "Questionnaire produits d'assurance vie" → différents
            - "Enquête annuelle" vs "Feedback sinistres" → différents

            JSON uniquement :
            {
              "doublon": boolean,
              "questionnaireSimilaire": "titre du questionnaire similaire ou vide",
              "similarite": number,
              "message": "explication courte si doublon, sinon vide"
            }
            """.formatted(titre, description != null ? description : "", mapper.writeValueAsString(existingTitles));
        return mapper.readValue(callAI(prompt), Map.class);
    }
}
