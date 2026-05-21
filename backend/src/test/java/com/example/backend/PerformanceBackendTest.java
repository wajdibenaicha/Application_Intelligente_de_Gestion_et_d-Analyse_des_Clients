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
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Tests de performance Backend — Spring Boot (Java HTTP client)
 * Lancer : ./mvnw test -Dtest=PerformanceBackendTest -Dsurefire.useFile=false
 * Rapport : target/perf-backend-report.html
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PerformanceBackendTest {

    @LocalServerPort int port;

    private static String token;

    private static final String FULLNAME = "wajdi";
    private static final String PASSWORD = "123456";

    private static final int N_SEQ   = 50;
    private static final int N_CONC  = 100;
    private static final int WORKERS = 20;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10)).build();

    // ── Collecte pour les courbes ─────────────────────────────────────────────
    private static final Map<String, long[]> chartData = new LinkedHashMap<>();
    // T5 progressive: [threads, avgMs, p95Ms, throughput]
    private static final List<double[]> t5Rows = new ArrayList<>();

    @FunctionalInterface interface ThrowingRunnable { void run() throws Exception; }

    // ── Utilitaires ───────────────────────────────────────────────────────────

    private String url(String path) { return "http://localhost:" + port + "/api" + path; }

    private HttpResponse<String> get(String path, String tok) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder().uri(URI.create(url(path))).GET();
        if (tok != null) b.header("Authorization", "Bearer " + tok);
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String path, String jsonBody, String tok) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder()
                .uri(URI.create(url(path)))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody));
        if (tok != null) b.header("Authorization", "Bearer " + tok);
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private long[] runSequential(ThrowingRunnable action, int n) {
        long[] ms = new long[n];
        for (int i = 0; i < n; i++) {
            long t = System.nanoTime();
            try { action.run(); } catch (Exception e) { System.err.println("Err: " + e.getMessage()); }
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
        System.out.printf("%n┌─ %s%n", title);
        if (s.length == 0) { System.out.println("│  Aucun résultat\n└─────────────────────────────────────────────────"); return; }
        double avg = Arrays.stream(s).average().orElse(0);
        System.out.printf("│  Requêtes : %d  |  Min : %d ms  |  Max : %d ms%n", s.length, s[0], s[s.length-1]);
        System.out.printf("│  Moyenne  : %.1f ms  |  P95 : %d ms  |  P99 : %d ms%n",
                avg, s[(int)(s.length*0.95)], s[Math.min((int)(s.length*0.99), s.length-1)]);
        System.out.printf("└─────────────────────────────────────────────────%n");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  T1 — Login séquentiel
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(1)
    @DisplayName("T1 — Login gestionnaire séquentiel (50 appels)")
    void t1_login_sequentiel() throws Exception {
        String body = new ObjectMapper().writeValueAsString(Map.of("fullName", FULLNAME, "password", PASSWORD));

        long[] ms = runSequential(() -> {
            HttpResponse<String> r = post("/gestionnaires/login", body, null);
            if (token == null) {
                JsonNode json = new ObjectMapper().readTree(r.body());
                String t = json.path("token").asText();
                if (!t.isEmpty()) token = t;
            }
        }, N_SEQ);

        chartData.put("T1 — Login séquentiel", ms);
        printStats("T1 — POST /gestionnaires/login  [séquentiel, n=" + N_SEQ + "]", ms);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  T2 — Login concurrent
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(2)
    @DisplayName("T2 — Login concurrent (100 req / 20 threads)")
    void t2_login_concurrent() throws Exception {
        String body = new ObjectMapper().writeValueAsString(Map.of("fullName", FULLNAME, "password", PASSWORD));
        long[] ms = runConcurrent(() -> post("/gestionnaires/login", body, null), N_CONC, WORKERS);
        chartData.put("T2 — Login concurrent", ms);
        printStats("T2 — POST /gestionnaires/login  [concurrent, " + WORKERS + " threads]", ms);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  T3 — GET Questionnaires séquentiel
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(3)
    @DisplayName("T3 — GET /questionnaires séquentiel (50 appels)")
    void t3_questionnaires_sequentiel() throws Exception {
        Assumptions.assumeTrue(token != null, "Token absent — T1 doit passer en premier");
        long[] ms = runSequential(() -> get("/questionnaires", token), N_SEQ);
        chartData.put("T3 — Questionnaires séquentiel", ms);
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
        long[] ms = runConcurrent(() -> get("/questionnaires", t), N_CONC, WORKERS);
        chartData.put("T4 — Questionnaires concurrent", ms);
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
            long[] ms = runConcurrent(() -> get("/clients", t), total, w);
            double dur = (System.nanoTime() - wallStart) / 1e9;
            long[] s = Arrays.stream(ms).filter(v -> v >= 0).sorted().toArray();
            if (s.length == 0) continue;
            double avg = Arrays.stream(s).average().orElse(0);
            double p95 = s[(int)(s.length * 0.95)];
            double throughput = total / dur;
            t5Rows.add(new double[]{w, avg, p95, throughput});
            System.out.printf("│ %-9d │ %-9d │ %-8.1f │ %-8.0f │ %-16.1f │%n", w, total, avg, p95, throughput);
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
        long[] ms = runSequential(() -> post("/kpi/calculate/1", "", token), 30);
        chartData.put("T6 — KPI Calculate séquentiel", ms);
        printStats("T6 — POST /kpi/calculate/1  [séquentiel, n=30]", ms);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  T7 — Stress test 500 logins simultanés
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(7)
    @DisplayName("T7 — Stress test 500 logins simultanés (50 threads)")
    void t7_stress_500_logins() throws Exception {
        String body = new ObjectMapper().writeValueAsString(Map.of("fullName", FULLNAME, "password", PASSWORD));
        int total   = 500;
        int workers = 50;

        System.out.println("\n[T7] Stress test — " + total + " requêtes / " + workers + " threads simultanés...");
        long wallStart = System.nanoTime();
        long[] ms = runConcurrent(() -> post("/gestionnaires/login", body, null), total, workers);
        double wallSec = (System.nanoTime() - wallStart) / 1e9;

        long[] s = Arrays.stream(ms).filter(v -> v >= 0).sorted().toArray();
        int ok = (int) Arrays.stream(ms).filter(v -> v >= 0).count();

        chartData.put("T7 — Stress 500 logins", ms);

        System.out.printf("%n┌─ T7 — Stress test 500 logins simultanés%n");
        System.out.printf("│  Requêtes envoyées  : %d%n", total);
        System.out.printf("│  Réponses reçues    : %d%n", ok);
        System.out.printf("│  Durée totale       : %.2f s%n", wallSec);
        System.out.printf("│  Débit réel         : %.1f req/s%n", ok / wallSec);
        if (s.length > 0) {
            double avg = Arrays.stream(s).average().orElse(0);
            System.out.printf("│  Min : %d ms  |  Moy : %.1f ms  |  P95 : %d ms  |  P99 : %d ms  |  Max : %d ms%n",
                    s[0], avg,
                    s[(int)(s.length * 0.95)],
                    s[Math.min((int)(s.length * 0.99), s.length - 1)],
                    s[s.length - 1]);
        }
        System.out.printf("└────────────────────────────────────────────────────%n");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Génération du rapport HTML
    // ─────────────────────────────────────────────────────────────────────────

    @AfterAll
    static void generateHtmlReport() throws Exception {
        String html = buildHtml();
        Path out = Path.of("target/perf-backend-report.html");
        Files.createDirectories(out.getParent());
        Files.writeString(out, html);
        System.out.println("\n================================================");
        System.out.println("  Rapport HTML genere : " + out.toAbsolutePath());
        System.out.println("================================================\n");
    }

    private static String buildHtml() {
        String[] colors = {
            "rgba(33,150,243,.8)", "rgba(76,175,80,.8)", "rgba(255,152,0,.8)",
            "rgba(156,39,176,.8)", "rgba(0,188,212,.8)", "rgba(244,67,54,.8)"
        };

        List<String> keys = new ArrayList<>(chartData.keySet());
        List<Double> avgs = new ArrayList<>();
        List<Long>   mins = new ArrayList<>();
        List<Long>   maxs = new ArrayList<>();
        List<Long>   p95s = new ArrayList<>();

        for (long[] ms : chartData.values()) {
            long[] s = Arrays.stream(ms).filter(v -> v >= 0).sorted().toArray();
            if (s.length > 0) {
                avgs.add(Arrays.stream(s).average().orElse(0));
                mins.add(s[0]); maxs.add(s[s.length - 1]); p95s.add(s[(int)(s.length * 0.95)]);
            } else { avgs.add(0.0); mins.add(0L); maxs.add(0L); p95s.add(0L); }
        }

        StringBuilder h = new StringBuilder();
        h.append("<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'>")
         .append("<title>Performance Backend — AIGAC</title>")
         .append("<script src='https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'></script>")
         .append("<style>")
         .append("*{box-sizing:border-box;margin:0;padding:0}")
         .append("body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:24px;color:#333}")
         .append("h1{text-align:center;color:#1a237e;margin-bottom:8px;font-size:28px}")
         .append(".subtitle{text-align:center;color:#666;margin-bottom:28px;font-size:14px}")
         .append(".summary-card{background:#1a237e;color:white;border-radius:12px;padding:24px;margin-bottom:28px;overflow-x:auto}")
         .append(".summary-card h2{color:#90caf9;margin-bottom:14px;font-size:16px}")
         .append("table{width:100%;border-collapse:collapse;font-size:13px}")
         .append("th{background:rgba(255,255,255,.1);padding:8px 12px;text-align:left}")
         .append("td{padding:7px 12px;border-bottom:1px solid rgba(255,255,255,.08)}")
         .append("tr:last-child td{border-bottom:none}")
         .append(".badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}")
         .append(".badge-ok{background:#4caf50;color:white}.badge-warn{background:#ff9800;color:white}")
         .append(".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(480px,1fr));gap:20px;margin-top:20px}")
         .append(".card{background:white;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.08)}")
         .append(".card h2{font-size:13px;color:#555;margin-bottom:14px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}")
         .append(".full-width{grid-column:1/-1}")
         .append("</style></head><body>")
         .append("<h1>Rapport de Performance Backend</h1>")
         .append("<p class='subtitle'>Application AIGAC — API Spring Boot — Généré le ")
         .append(new java.util.Date()).append("</p>");

        // Table résumé
        h.append("<div class='summary-card'><h2>Tableau Récapitulatif</h2>")
         .append("<table><tr><th>Test</th><th>N</th><th>Min</th><th>Moyenne</th><th>P95</th><th>Max</th><th>Statut</th></tr>");
        for (int i = 0; i < keys.size(); i++) {
            long[] ms = chartData.get(keys.get(i));
            long[] s  = Arrays.stream(ms).filter(v -> v >= 0).sorted().toArray();
            String badge = avgs.get(i) < 200
                    ? "<span class='badge badge-ok'>OK</span>"
                    : "<span class='badge badge-warn'>LENT</span>";
            h.append("<tr><td>").append(keys.get(i)).append("</td>")
             .append("<td>").append(s.length).append("</td>")
             .append("<td>").append(mins.get(i)).append(" ms</td>")
             .append("<td>").append(String.format("%.1f", avgs.get(i))).append(" ms</td>")
             .append("<td>").append(p95s.get(i)).append(" ms</td>")
             .append("<td>").append(maxs.get(i)).append(" ms</td>")
             .append("<td>").append(badge).append("</td></tr>");
        }
        h.append("</table></div>");

        // Layout
        h.append("<div class='card full-width'><h2>Vue d'ensemble — Temps moyen par test (ms)</h2>")
         .append("<canvas id='cSummary' height='80'></canvas></div>")
         .append("<div class='grid'>");

        // T5 card
        if (!t5Rows.isEmpty()) {
            h.append("<div class='card full-width'><h2>T5 — Charge progressive /clients (threads vs latence &amp; débit)</h2>")
             .append("<canvas id='cT5' height='80'></canvas></div>");
        }

        // Courbes individuelles
        int idx = 0;
        for (String key : keys) {
            h.append("<div class='card'><h2>").append(key).append("</h2>")
             .append("<canvas id='c").append(idx).append("'></canvas></div>");
            idx++;
        }
        h.append("</div><script>");

        // Chart résumé
        String keysJson = keys.stream()
                .map(k -> "\"" + k.replace("\"", "\\\"") + "\"")
                .collect(Collectors.joining(",", "[", "]"));
        String avgsJson = avgs.stream().map(a -> String.format("%.1f", a)).collect(Collectors.joining(",", "[", "]"));
        String bgColors = IntStream.range(0, keys.size())
                .mapToObj(i -> "\"" + colors[i % colors.length] + "\"")
                .collect(Collectors.joining(",", "[", "]"));

        h.append("new Chart(document.getElementById('cSummary'),{type:'bar',data:{labels:")
         .append(keysJson).append(",datasets:[{label:'Temps moyen (ms)',data:").append(avgsJson)
         .append(",backgroundColor:").append(bgColors).append(",borderRadius:6}]},")
         .append("options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,title:{display:true,text:'Temps (ms)'}}}}});");

        // T5 — charge progressive (double axe Y)
        if (!t5Rows.isEmpty()) {
            String t5Threads = t5Rows.stream().map(r -> String.valueOf((int)r[0])).collect(Collectors.joining(",", "[", "]"));
            String t5Avg     = t5Rows.stream().map(r -> String.format("%.1f", r[1])).collect(Collectors.joining(",", "[", "]"));
            String t5P95     = t5Rows.stream().map(r -> String.format("%.0f", r[2])).collect(Collectors.joining(",", "[", "]"));
            String t5Tput    = t5Rows.stream().map(r -> String.format("%.1f", r[3])).collect(Collectors.joining(",", "[", "]"));

            h.append("new Chart(document.getElementById('cT5'),{type:'line',data:{labels:").append(t5Threads)
             .append(",datasets:[{label:'Latence moy (ms)',data:").append(t5Avg)
             .append(",borderColor:'rgba(33,150,243,.9)',backgroundColor:'rgba(33,150,243,.1)',tension:0.3,yAxisID:'y',fill:true},")
             .append("{label:'P95 (ms)',data:").append(t5P95)
             .append(",borderColor:'rgba(255,152,0,.9)',borderDash:[5,3],tension:0.3,yAxisID:'y',fill:false},")
             .append("{label:'Débit (req/s)',data:").append(t5Tput)
             .append(",borderColor:'rgba(76,175,80,.9)',backgroundColor:'rgba(76,175,80,.05)',tension:0.3,yAxisID:'y2',fill:true}]},")
             .append("options:{responsive:true,interaction:{mode:'index'},plugins:{legend:{position:'top'}},")
             .append("scales:{x:{title:{display:true,text:'Threads simultanés'}},")
             .append("y:{beginAtZero:true,position:'left',title:{display:true,text:'Latence (ms)'}},")
             .append("y2:{beginAtZero:true,position:'right',title:{display:true,text:'Débit (req/s)'},grid:{drawOnChartArea:false}}}}});");
        }

        // Courbes individuelles
        idx = 0;
        for (Map.Entry<String, long[]> entry : chartData.entrySet()) {
            long[] ms   = entry.getValue();
            String key  = entry.getKey();
            long[] s    = Arrays.stream(ms).filter(v -> v >= 0).sorted().toArray();
            double avg  = s.length > 0 ? Arrays.stream(s).average().orElse(0) : 0;
            String color = colors[idx % colors.length];

            if (key.contains("Stress") && s.length > 0) {
                // Histogramme de distribution pour le stress test
                int bucketSize = 50; // ms par tranche
                long maxVal = s[s.length - 1];
                int numBuckets = (int)(maxVal / bucketSize) + 1;
                int[] counts = new int[numBuckets];
                for (long v : s) counts[(int)(v / bucketSize)]++;

                String buckLabels = IntStream.range(0, numBuckets)
                        .mapToObj(i -> "\"" + (i * bucketSize) + "-" + ((i + 1) * bucketSize) + " ms\"")
                        .collect(Collectors.joining(",", "[", "]"));
                String buckData = Arrays.stream(counts).mapToObj(Integer::toString)
                        .collect(Collectors.joining(",", "[", "]"));

                long p50  = s[s.length / 2];
                long p95v = s[(int)(s.length * 0.95)];
                long p99v = s[Math.min((int)(s.length * 0.99), s.length - 1)];

                h.append("new Chart(document.getElementById('c").append(idx).append("'),{type:'bar',data:{labels:")
                 .append(buckLabels).append(",datasets:[{label:'Nombre de requêtes',data:").append(buckData)
                 .append(",backgroundColor:'rgba(33,150,243,.6)',borderColor:'rgba(33,150,243,.9)',borderWidth:1,borderRadius:3}]},")
                 .append("options:{responsive:true,plugins:{legend:{position:'top'},")
                 .append("title:{display:true,text:'Min:").append(s[0]).append("ms | Moy:").append(String.format("%.0f", avg))
                 .append("ms | P50:").append(p50).append("ms | P95:").append(p95v)
                 .append("ms | P99:").append(p99v).append("ms | Max:").append(s[s.length-1]).append("ms'}},")
                 .append("scales:{x:{title:{display:true,text:'Tranche de temps'}},")
                 .append("y:{beginAtZero:true,title:{display:true,text:'Requêtes'}}}}}); ");
            } else {
                // Courbe classique pour les autres tests
                String xLabels = IntStream.rangeClosed(1, ms.length)
                        .mapToObj(Integer::toString).collect(Collectors.joining(",", "[", "]"));
                String yData = Arrays.stream(ms).mapToObj(Long::toString).collect(Collectors.joining(",", "[", "]"));
                String avgLine = Collections.nCopies(ms.length, String.format("%.1f", avg))
                        .stream().collect(Collectors.joining(",", "[", "]"));

                h.append("new Chart(document.getElementById('c").append(idx).append("'),{type:'line',data:{labels:")
                 .append(xLabels).append(",datasets:[{label:'Temps (ms)',data:").append(yData)
                 .append(",borderColor:'").append(color).append("',backgroundColor:'").append(color.replace(".8", ".1"))
                 .append("',tension:0.3,pointRadius:3,fill:true},")
                 .append("{label:'Moy ").append(String.format("%.0f", avg)).append(" ms',data:").append(avgLine)
                 .append(",borderColor:'rgba(244,67,54,.8)',borderDash:[6,3],pointRadius:0,borderWidth:2}]},")
                 .append("options:{responsive:true,plugins:{legend:{position:'top'}},")
                 .append("scales:{y:{beginAtZero:true,title:{display:true,text:'ms'}}}}});");
            }
            idx++;
        }

        h.append("</script></body></html>");
        return h.toString();
    }
}
