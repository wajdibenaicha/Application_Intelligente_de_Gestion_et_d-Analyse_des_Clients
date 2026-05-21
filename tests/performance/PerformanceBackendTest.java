package performance;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.*;
import java.util.concurrent.*;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * Tests de performance Backend — Spring Boot
 * Copier dans backend/src/test/java/com/example/backend/performance/ pour exécuter.
 * Lancer : ./mvnw test -Dtest=PerformanceBackendTest
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PerformanceBackendTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    private static String token;

    // ── Adapter ces valeurs à un compte gestionnaire existant ────────────────
    private static final String EMAIL    = "gestionnaire@app.com";
    private static final String PASSWORD = "gest123";

    // ── Paramètres de charge ─────────────────────────────────────────────────
    private static final int N_SEQ  = 50;   // appels séquentiels
    private static final int N_CONC = 100;  // appels concurrents
    private static final int WORKERS = 20;  // threads simultanés

    // ─────────────────────────────────────────────────────────────────────────
    //  Utilitaires
    // ─────────────────────────────────────────────────────────────────────────

    private long[] runSequential(ThrowingRunnable action, int n) throws Exception {
        long[] ms = new long[n];
        for (int i = 0; i < n; i++) {
            long t = System.nanoTime();
            action.run();
            ms[i] = (System.nanoTime() - t) / 1_000_000;
        }
        return ms;
    }

    private long[] runConcurrent(ThrowingRunnable action, int total, int workers) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(workers);
        List<Future<Long>> futs = new ArrayList<>();
        for (int i = 0; i < total; i++) {
            futs.add(pool.submit(() -> {
                long t = System.nanoTime();
                try { action.run(); } catch (Exception ignored) {}
                return (System.nanoTime() - t) / 1_000_000;
            }));
        }
        pool.shutdown();
        pool.awaitTermination(120, TimeUnit.SECONDS);
        return futs.stream().mapToLong(f -> { try { return f.get(); } catch (Exception e) { return -1; } }).toArray();
    }

    private void printStats(String title, long[] ms) {
        long[] s = Arrays.stream(ms).filter(v -> v >= 0).sorted().toArray();
        double avg = Arrays.stream(s).average().orElse(0);
        System.out.printf("%n┌─ %s%n", title);
        System.out.printf("│  Requêtes : %d  |  Min : %d ms  |  Max : %d ms%n", s.length, s[0], s[s.length-1]);
        System.out.printf("│  Moyenne  : %.1f ms  |  P95 : %d ms  |  P99 : %d ms%n",
                avg,
                s[(int)(s.length * 0.95)],
                s[Math.min((int)(s.length * 0.99), s.length - 1)]);
        System.out.printf("└─────────────────────────────────────────────────%n");
    }

    @FunctionalInterface interface ThrowingRunnable { void run() throws Exception; }

    // ─────────────────────────────────────────────────────────────────────────
    //  T1 — Login séquentiel
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(1)
    @DisplayName("T1 — Login gestionnaire séquentiel (50 appels)")
    void t1_login_sequentiel() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("email", EMAIL, "password", PASSWORD));

        long[] ms = runSequential(() -> {
            MvcResult r = mockMvc.perform(post("/api/gestionnaires/login")
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn();
            if (token == null)
                token = objectMapper.readTree(r.getResponse().getContentAsString()).path("token").asText();
        }, N_SEQ);

        printStats("T1 — POST /gestionnaires/login  [séquentiel, n=" + N_SEQ + "]", ms);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  T2 — Login concurrent
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(2)
    @DisplayName("T2 — Login concurrent (100 req / 20 threads)")
    void t2_login_concurrent() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("email", EMAIL, "password", PASSWORD));

        long[] ms = runConcurrent(() ->
            mockMvc.perform(post("/api/gestionnaires/login")
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn(),
            N_CONC, WORKERS);

        printStats("T2 — POST /gestionnaires/login  [concurrent, " + WORKERS + " threads]", ms);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  T3 — GET Questionnaires séquentiel
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(3)
    @DisplayName("T3 — GET /questionnaires séquentiel (50 appels)")
    void t3_questionnaires_sequentiel() throws Exception {
        Assumptions.assumeTrue(token != null, "Token absent — T1 doit passer en premier");

        long[] ms = runSequential(() ->
            mockMvc.perform(get("/api/questionnaires")
                    .header("Authorization", "Bearer " + token)).andReturn(),
            N_SEQ);

        printStats("T3 — GET /questionnaires  [séquentiel, n=" + N_SEQ + "]", ms);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  T4 — GET Questionnaires concurrent
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(4)
    @DisplayName("T4 — GET /questionnaires concurrent (100 req / 20 threads)")
    void t4_questionnaires_concurrent() throws Exception {
        Assumptions.assumeTrue(token != null, "Token absent");
        final String t = token;

        long[] ms = runConcurrent(() ->
            mockMvc.perform(get("/api/questionnaires")
                    .header("Authorization", "Bearer " + t)).andReturn(),
            N_CONC, WORKERS);

        printStats("T4 — GET /questionnaires  [concurrent, " + WORKERS + " threads]", ms);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  T5 — GET Clients charge progressive
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(5)
    @DisplayName("T5 — GET /clients charge progressive (1→5→10→20→50 threads)")
    void t5_clients_charge_progressive() throws Exception {
        Assumptions.assumeTrue(token != null, "Token absent");
        final String t = token;

        System.out.println("\n┌───────────┬───────────┬──────────┬──────────┬──────────────────┐");
        System.out.println("│  Threads  │ Requêtes  │ Moy (ms) │ P95 (ms) │ Throughput req/s │");
        System.out.println("├───────────┼───────────┼──────────┼──────────┼──────────────────┤");

        for (int w : new int[]{1, 5, 10, 20, 50}) {
            int total = w * 5;
            long wallStart = System.nanoTime();
            long[] ms = runConcurrent(() ->
                mockMvc.perform(get("/api/clients")
                        .header("Authorization", "Bearer " + t)).andReturn(),
                total, w);
            double dur = (System.nanoTime() - wallStart) / 1e9;
            long[] s = Arrays.stream(ms).filter(v -> v >= 0).sorted().toArray();
            double avg = Arrays.stream(s).average().orElse(0);
            System.out.printf("│ %-9d │ %-9d │ %-8.1f │ %-8d │ %-16.1f │%n",
                    w, total, avg, s[(int)(s.length*0.95)], total / dur);
        }
        System.out.println("└───────────┴───────────┴──────────┴──────────┴──────────────────┘");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  T6 — Calcul KPI
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(6)
    @DisplayName("T6 — POST /kpi/calculate/1 séquentiel (30 appels)")
    void t6_kpi_calculate() throws Exception {
        Assumptions.assumeTrue(token != null, "Token absent");

        long[] ms = runSequential(() ->
            mockMvc.perform(post("/api/kpi/calculate/1")
                    .header("Authorization", "Bearer " + token)).andReturn(),
            30);

        printStats("T6 — POST /kpi/calculate/1  [séquentiel, n=30]", ms);
    }
}
