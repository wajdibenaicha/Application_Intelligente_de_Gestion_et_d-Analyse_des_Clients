package com.example.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Tests de sécurité — Spring Boot / JWT
 * Lancer : ./mvnw test "-Dtest=SecurityTest" "-Dsurefire.useFile=false"
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SecurityTest {

    @LocalServerPort int port;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String GEST_EMAIL     = "gestionnaire@app.com";
    private static final String GEST_PASSWORD  = "gest123";
    private static final String ADMIN_EMAIL    = "admin@app.com";
    private static final String ADMIN_PASSWORD = "admin123";

    private static String gestionnaireToken;
    private static String adminToken;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5)).build();

    // ── Utilitaires ──────────────────────────────────────────────────────────

    private String url(String path) {
        return "http://localhost:" + port + "/api" + path;
    }

    private HttpResponse<String> get(String path, String token) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder().uri(URI.create(url(path))).GET();
        if (token != null) b.header("Authorization", "Bearer " + token);
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String path, String jsonBody, String authHeader) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder()
                .uri(URI.create(url(path)))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody));
        if (authHeader != null) b.header("Authorization", authHeader);
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private String loginBody(String email, String password) throws Exception {
        return objectMapper.writeValueAsString(java.util.Map.of("email", email, "password", password));
    }

    private void print(String label, String detail) {
        System.out.printf("%n[✓ PASS] %s%n         %s%n", label, detail);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SEC-01 : Accès sans token → 401
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(1) @DisplayName("SEC-01 — Accès sans token → refusé (401/403)")
    void sec01_acces_sans_token() throws Exception {
        HttpResponse<String> r = get("/questionnaires", null);
        Assertions.assertTrue(r.statusCode() == 401 || r.statusCode() == 403,
                "Attendu 401 ou 403, reçu : " + r.statusCode());
        print("SEC-01 — Accès sans token", "GET /questionnaires → HTTP " + r.statusCode());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SEC-02 : Token invalide → 401
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(2) @DisplayName("SEC-02 — Token invalide → refusé (401/403)")
    void sec02_token_invalide() throws Exception {
        HttpResponse<String> r = get("/questionnaires", "token_completement_faux_12345");
        Assertions.assertTrue(r.statusCode() == 401 || r.statusCode() == 403,
                "Attendu 401 ou 403, reçu : " + r.statusCode());
        print("SEC-02 — Token invalide", "Bearer faux → HTTP " + r.statusCode());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SEC-03 : Token mal formé (sans Bearer) → 401
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(3) @DisplayName("SEC-03 — Token mal formé → refusé (401/403)")
    void sec03_token_mal_forme() throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url("/questionnaires")))
                .header("Authorization", "invalid_no_bearer_prefix")
                .GET().build();
        HttpResponse<String> r = http.send(req, HttpResponse.BodyHandlers.ofString());
        Assertions.assertTrue(r.statusCode() == 401 || r.statusCode() == 403,
                "Attendu 401 ou 403, reçu : " + r.statusCode());
        print("SEC-03 — Token mal formé", "Sans 'Bearer' → HTTP " + r.statusCode());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SEC-04 : Mauvais mot de passe → pas de token
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(4) @DisplayName("SEC-04 — Mauvais mot de passe → pas de token")
    void sec04_mauvais_password() throws Exception {
        HttpResponse<String> r = post("/gestionnaires/login",
                loginBody(GEST_EMAIL, "MAUVAIS_MDP"), null);
        String body = r.body() != null ? r.body() : "";
        boolean hasToken = body.contains("\"token\"") && !body.contains("\"token\":null") && body.length() > 60;
        Assertions.assertFalse(hasToken);
        print("SEC-04 — Mauvais mot de passe", "HTTP " + r.statusCode() + " — aucun token retourné");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SEC-05 : Email inexistant → pas de token
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(5) @DisplayName("SEC-05 — Email inexistant → pas de token")
    void sec05_email_inexistant() throws Exception {
        HttpResponse<String> r = post("/gestionnaires/login",
                loginBody("inconnu@fake.com", "quelconque"), null);
        String body = r.body() != null ? r.body() : "";
        boolean hasToken = body.contains("\"token\"") && !body.contains("\"token\":null") && body.length() > 60;
        Assertions.assertFalse(hasToken);
        print("SEC-05 — Email inexistant", "HTTP " + r.statusCode() + " — aucun token");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SEC-06 : Injection SQL → rejeté
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(6) @DisplayName("SEC-06 — Injection SQL → rejeté")
    void sec06_injection_sql() throws Exception {
        String[] payloads = {
            "' OR '1'='1", "admin'--", "' OR 1=1--", "'; DROP TABLE gestionnaire;--"
        };
        for (String payload : payloads) {
            HttpResponse<String> r = post("/gestionnaires/login",
                    loginBody(payload, "test"), null);
            String body = r.body() != null ? r.body() : "";
            boolean hasToken = body.contains("\"token\"") && !body.contains("\"token\":null") && body.length() > 60;
            Assertions.assertFalse(hasToken, "Injection SQL ne doit pas retourner un token : " + payload);
        }
        print("SEC-06 — Injection SQL", "4 payloads testés → aucun token retourné (JPA paramétré protège)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SEC-07 : Login valide gestionnaire → token JWT
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(7) @DisplayName("SEC-07 — Login valide gestionnaire → token JWT")
    void sec07_login_valide_gestionnaire() throws Exception {
        HttpResponse<String> r = post("/gestionnaires/login",
                loginBody(GEST_EMAIL, GEST_PASSWORD), null);
        JsonNode json = objectMapper.readTree(r.body());
        gestionnaireToken = json.path("token").asText();

        Assumptions.assumeFalse(gestionnaireToken.isEmpty(),
                "Adapter GEST_EMAIL/GEST_PASSWORD avec un compte existant");
        Assertions.assertTrue(gestionnaireToken.startsWith("ey"), "JWT doit commencer par 'ey'");
        Assertions.assertEquals(3, gestionnaireToken.split("\\.").length, "JWT = 3 parties");
        print("SEC-07 — Login gestionnaire valide", "Token JWT → " + gestionnaireToken.substring(0, 20) + "...");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SEC-08 : Login valide admin → token JWT
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(8) @DisplayName("SEC-08 — Login admin valide → token JWT")
    void sec08_login_valide_admin() throws Exception {
        HttpResponse<String> r = post("/administrateurs/login",
                loginBody(ADMIN_EMAIL, ADMIN_PASSWORD), null);
        JsonNode json = objectMapper.readTree(r.body());
        adminToken = json.path("token").asText();

        Assumptions.assumeFalse(adminToken.isEmpty(),
                "Adapter ADMIN_EMAIL/ADMIN_PASSWORD avec un compte admin existant");
        Assertions.assertTrue(adminToken.startsWith("ey"), "JWT doit commencer par 'ey'");
        Assertions.assertEquals(3, adminToken.split("\\.").length, "JWT = 3 parties");
        print("SEC-08 — Login admin valide", "Token JWT → " + adminToken.substring(0, 20) + "...");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SEC-09 : Accès avec token valide → 200 OK
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(9) @DisplayName("SEC-09 — Accès avec token valide → 200 OK")
    void sec09_acces_avec_token_valide() throws Exception {
        Assumptions.assumeTrue(gestionnaireToken != null && !gestionnaireToken.isEmpty());
        HttpResponse<String> r = get("/questionnaires", gestionnaireToken);
        Assertions.assertEquals(200, r.statusCode());
        print("SEC-09 — Token valide accepté", "GET /questionnaires → HTTP " + r.statusCode());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SEC-10 : Token gestionnaire sur route admin → refusé
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(10) @DisplayName("SEC-10 — Token gestionnaire sur route admin → refusé")
    void sec10_isolation_admin_gestionnaire() throws Exception {
        Assumptions.assumeTrue(gestionnaireToken != null && !gestionnaireToken.isEmpty());
        HttpResponse<String> r = get("/administrateurs", gestionnaireToken);
        Assertions.assertNotEquals(200, r.statusCode());
        print("SEC-10 — Isolation admin/gestionnaire",
                "Token gestionnaire sur /administrateurs → HTTP " + r.statusCode());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SEC-11 : Mot de passe non exposé dans la réponse
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(11) @DisplayName("SEC-11 — Mot de passe non exposé dans la réponse JSON")
    void sec11_password_non_expose() throws Exception {
        HttpResponse<String> r = post("/gestionnaires/login",
                loginBody(GEST_EMAIL, GEST_PASSWORD), null);
        String body = r.body() != null ? r.body() : "";
        Assertions.assertFalse(body.contains(GEST_PASSWORD), "Mot de passe en clair ne doit pas apparaître");
        Assertions.assertFalse(body.contains("\"password\":\""), "Champ password ne doit pas être exposé");
        print("SEC-11 — Mot de passe non exposé", "Aucun password en clair dans la réponse JSON");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SEC-12 : Routes publiques accessibles sans token
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(12) @DisplayName("SEC-12 — Routes publiques accessibles sans token")
    void sec12_routes_publiques() throws Exception {
        String body = loginBody("x@x.com", "x");
        HttpResponse<String> r1 = post("/administrateurs/login", body, null);
        HttpResponse<String> r2 = post("/gestionnaires/login", body, null);

        // 403 = Spring Security blocked (not public). 401 = controller responded (route IS public but bad creds).
        Assertions.assertNotEquals(403, r1.statusCode(), "/administrateurs/login doit être public");
        Assertions.assertNotEquals(403, r2.statusCode(), "/gestionnaires/login doit être public");
        print("SEC-12 — Routes publiques",
                "Login admin → " + r1.statusCode() + " | Login gest → " + r2.statusCode());
    }
}
