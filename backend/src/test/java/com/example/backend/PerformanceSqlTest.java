package com.example.backend;

import com.example.backend.Repository.ClientRepository;
import com.example.backend.Repository.GestionnaireRepository;
import com.example.backend.Repository.PermissionRepository;
import com.example.backend.Repository.QuestionnaireRepository;
import com.example.backend.Repository.ReponseRepository;
import com.example.backend.Repository.RoleRepository;
import com.example.backend.models.Client;
import com.example.backend.models.Gestionnaire;
import com.example.backend.models.Questionnaire;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Tests de performance SQL — MySQL via Spring Data JPA
 * Lancer : ./mvnw test -Dtest=PerformanceSqlTest -Dsurefire.useFile=false
 * Rapport : target/perf-sql-report.html
 */
@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PerformanceSqlTest {

    @Autowired ClientRepository       clientRepo;
    @Autowired QuestionnaireRepository questionnaireRepo;
    @Autowired ReponseRepository      reponseRepo;
    @Autowired GestionnaireRepository gestionnaireRepo;
    @Autowired RoleRepository         roleRepo;
    @Autowired PermissionRepository   permissionRepo;

    // ── Collecte des données pour les courbes ────────────────────────────────
    private static final Map<String, long[]> chartData = new LinkedHashMap<>();
    private static long[] s5Times = new long[0];

    // ── Utilitaires ──────────────────────────────────────────────────────────

    private long timeMs(ThrowingRunnable action) {
        long t = System.nanoTime();
        try { action.run(); } catch (Exception e) { System.err.println("Erreur : " + e.getMessage()); }
        return (System.nanoTime() - t) / 1_000_000;
    }

    private void printStats(String title, long[] ms) {
        long[] s = Arrays.stream(ms).filter(v -> v >= 0).sorted().toArray();
        System.out.printf("%n┌─ %s%n", title);
        if (s.length == 0) {
            System.out.println("│  Aucun résultat (toutes les opérations ont échoué)");
            System.out.println("└─────────────────────────────────────────────────");
            return;
        }
        double avg = Arrays.stream(s).average().orElse(0);
        System.out.printf("│  Exécutions : %d  |  Min : %d ms  |  Max : %d ms%n", s.length, s[0], s[s.length - 1]);
        System.out.printf("│  Moyenne    : %.2f ms  |  P95 : %d ms%n", avg, s[(int)(s.length * 0.95)]);
        System.out.printf("└─────────────────────────────────────────────────%n");
    }

    @FunctionalInterface interface ThrowingRunnable { void run() throws Exception; }

    // ─────────────────────────────────────────────────────────────────────────
    //  S1 — SELECT all clients
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(1)
    @DisplayName("S1 — SELECT tous les clients (30 répétitions)")
    void s1_select_all_clients() {
        int n = 30;
        long[] ms = new long[n];
        for (int i = 0; i < n; i++) ms[i] = timeMs(() -> clientRepo.findAll());
        chartData.put("S1 — SELECT clients", ms);
        printStats("S1 — clientRepo.findAll()  [n=" + n + "]", ms);
        System.out.println("     Nombre de clients en base : " + clientRepo.count());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  S2 — SELECT clients par email
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(2)
    @DisplayName("S2 — Recherche client par email (20 répétitions)")
    void s2_recherche_client_email() {
        List<Client> all = clientRepo.findAll();
        Assumptions.assumeFalse(all.isEmpty(), "Aucun client en base");
        String email = all.get(0).getMail();

        int n = 20;
        long[] ms = new long[n];
        for (int i = 0; i < n; i++) ms[i] = timeMs(() -> clientRepo.findByMail(email));
        chartData.put("S2 — findByMail", ms);
        printStats("S2 — clientRepo.findByMail()  [n=" + n + "]", ms);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  S3 — SELECT questionnaires d'un gestionnaire
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(3)
    @DisplayName("S3 — SELECT questionnaires par gestionnaire (20 répétitions)")
    void s3_questionnaires_par_gestionnaire() {
        List<Gestionnaire> gests = gestionnaireRepo.findAll();
        Assumptions.assumeFalse(gests.isEmpty(), "Aucun gestionnaire en base");
        Long gestId = gests.get(0).getId();

        int n = 20;
        long[] ms = new long[n];
        for (int i = 0; i < n; i++) ms[i] = timeMs(() -> questionnaireRepo.findByGestionnaireId(gestId));
        chartData.put("S3 — Questionnaires/gestionnaire", ms);
        printStats("S3 — questionnaireRepo.findByGestionnaireId()  [n=" + n + "]", ms);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  S4 — SELECT réponses par questionnaire
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(4)
    @DisplayName("S4 — SELECT réponses par questionnaire (jointure, 20 répétitions)")
    void s4_reponses_par_questionnaire() {
        List<Questionnaire> qs = questionnaireRepo.findAll();
        Assumptions.assumeFalse(qs.isEmpty(), "Aucun questionnaire en base");
        Long qId = qs.get(0).getId();

        int n = 20;
        long[] ms = new long[n];
        for (int i = 0; i < n; i++) ms[i] = timeMs(() -> reponseRepo.findByQuestionnaireId(qId));
        chartData.put("S4 — Réponses/questionnaire", ms);
        printStats("S4 — reponseRepo.findByQuestionnaireId()  [n=" + n + "]", ms);
        System.out.println("     Réponses trouvées : " + reponseRepo.findByQuestionnaireId(qId).size());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  S5 — COUNT requêtes agrégées
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(5)
    @DisplayName("S5 — COUNT agrégats (clients, questionnaires, réponses)")
    void s5_count_agregats() {
        System.out.println("\n┌─ S5 — COUNT agrégats");
        long t1 = timeMs(() -> clientRepo.count());
        long t2 = timeMs(() -> questionnaireRepo.count());
        long t3 = timeMs(() -> reponseRepo.count());
        long t4 = timeMs(() -> gestionnaireRepo.count());
        s5Times = new long[]{t1, t2, t3, t4};

        System.out.printf("│  COUNT clients        : %d ms  (%d enregistrements)%n", t1, clientRepo.count());
        System.out.printf("│  COUNT questionnaires : %d ms  (%d enregistrements)%n", t2, questionnaireRepo.count());
        System.out.printf("│  COUNT réponses       : %d ms  (%d enregistrements)%n", t3, reponseRepo.count());
        System.out.printf("│  COUNT gestionnaires  : %d ms  (%d enregistrements)%n", t4, gestionnaireRepo.count());
        System.out.println("└─────────────────────────────────────────────────");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  S6 — INSERT concurrent
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(6)
    @DisplayName("S6 — INSERT concurrent clients (10 threads, 5 inserts chacun)")
    void s6_insert_concurrent_clients() throws InterruptedException {
        int workers = 10;
        int perThread = 5;
        List<Long> insertTimes = Collections.synchronizedList(new ArrayList<>());
        List<Long> insertedIds = Collections.synchronizedList(new ArrayList<>());
        long base = System.nanoTime();

        ExecutorService pool = Executors.newFixedThreadPool(workers);
        List<Future<?>> futures = new ArrayList<>();

        for (int w = 0; w < workers; w++) {
            final int wId = w;
            futures.add(pool.submit(() -> {
                for (int i = 0; i < perThread; i++) {
                    long uid = base + wId * 1000L + i;
                    Client c = new Client();
                    c.setFullName("PerfTest-" + uid);
                    c.setMail("perf" + uid + "@test.com");
                    c.setTel("06" + String.format("%08d", uid % 100_000_000L));
                    c.setNumeroContrat("PERF-" + uid);
                    c.setTypeContrat("AUTO");
                    c.setAnneeInscription(2020);
                    c.setPrimeAnnuelle(1000.0);

                    long t = System.nanoTime();
                    Client saved = clientRepo.save(c);
                    insertTimes.add((System.nanoTime() - t) / 1_000_000);
                    insertedIds.add(saved.getId());
                }
            }));
        }

        pool.shutdown();
        pool.awaitTermination(60, TimeUnit.SECONDS);
        for (Future<?> f : futures) {
            try { f.get(); } catch (ExecutionException e) {
                System.err.println("Erreur insert : " + e.getCause().getMessage());
            }
        }

        long[] ms = insertTimes.stream().mapToLong(Long::longValue).toArray();
        chartData.put("S6 — INSERT concurrent", ms);
        printStats("S6 — INSERT concurrent clients  [" + workers + " threads × " + perThread + " inserts]", ms);
        System.out.println("     Total inserts réussis : " + ms.length);

        clientRepo.deleteAllById(insertedIds);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  S7 — Chargement rôles + permissions (EAGER)
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(7)
    @DisplayName("S7 — Chargement rôles + permissions (EAGER, 30 répétitions)")
    void s7_roles_permissions_eager() {
        int n = 30;
        long[] ms = new long[n];
        for (int i = 0; i < n; i++) ms[i] = timeMs(() -> roleRepo.findAll());
        chartData.put("S7 — Rôles+Permissions EAGER", ms);
        printStats("S7 — roleRepo.findAll() avec permissions EAGER  [n=" + n + "]", ms);
        System.out.println("     Rôles en base : " + roleRepo.count()
                + "  |  Permissions : " + permissionRepo.count());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Génération du rapport HTML
    // ─────────────────────────────────────────────────────────────────────────

    @AfterAll
    static void generateHtmlReport() throws Exception {
        String html = buildHtml();
        Path out = Path.of("target/perf-sql-report.html");
        Files.createDirectories(out.getParent());
        Files.writeString(out, html);
        System.out.println("\n================================================");
        System.out.println("  Rapport HTML genere : " + out.toAbsolutePath());
        System.out.println("================================================\n");
    }

    private static String buildHtml() {
        // ── Calcul des stats résumé ───────────────────────────────────────────
        List<String> keys = new ArrayList<>(chartData.keySet());
        List<Double> avgs = new ArrayList<>();
        List<Long> mins = new ArrayList<>();
        List<Long> maxs = new ArrayList<>();
        List<Long> p95s = new ArrayList<>();

        for (long[] ms : chartData.values()) {
            long[] s = Arrays.stream(ms).filter(v -> v >= 0).sorted().toArray();
            if (s.length > 0) {
                avgs.add(Arrays.stream(s).average().orElse(0));
                mins.add(s[0]);
                maxs.add(s[s.length - 1]);
                p95s.add(s[(int)(s.length * 0.95)]);
            } else {
                avgs.add(0.0); mins.add(0L); maxs.add(0L); p95s.add(0L);
            }
        }

        // ── HTML ─────────────────────────────────────────────────────────────
        StringBuilder h = new StringBuilder();
        h.append("<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'>")
         .append("<title>Performance SQL — AIGAC</title>")
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
         .append(".badge-ok{background:#4caf50;color:white}")
         .append(".badge-warn{background:#ff9800;color:white}")
         .append(".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(480px,1fr));gap:20px;margin-top:20px}")
         .append(".card{background:white;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.08)}")
         .append(".card h2{font-size:13px;color:#555;margin-bottom:14px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}")
         .append(".full-width{grid-column:1/-1}")
         .append("</style></head><body>")
         .append("<h1>Rapport de Performance SQL</h1>")
         .append("<p class='subtitle'>Application AIGAC — Base MySQL — Généré le ")
         .append(new java.util.Date()).append("</p>");

        // ── Table résumé ─────────────────────────────────────────────────────
        h.append("<div class='summary-card'><h2>Tableau Récapitulatif</h2>")
         .append("<table><tr><th>Test</th><th>N</th><th>Min</th><th>Moyenne</th><th>P95</th><th>Max</th><th>Statut</th></tr>");
        for (int i = 0; i < keys.size(); i++) {
            long[] ms = chartData.get(keys.get(i));
            long[] s = Arrays.stream(ms).filter(v -> v >= 0).sorted().toArray();
            String badge = avgs.get(i) < 100
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

        // ── Chart résumé (barres) ─────────────────────────────────────────────
        h.append("<div class='card full-width'><h2>Vue d'ensemble — Temps moyen par test (ms)</h2>")
         .append("<canvas id='cSummary' height='80'></canvas></div>");

        // ── S5 — COUNT bar chart ──────────────────────────────────────────────
        if (s5Times.length == 4) {
            h.append("<div class='grid'><div class='card'><h2>S5 — COUNT agrégats par entité</h2>")
             .append("<canvas id='cS5'></canvas></div>");
        } else {
            h.append("<div class='grid'>");
        }

        // ── Courbes individuelles ─────────────────────────────────────────────
        int idx = 0;
        for (String key : keys) {
            h.append("<div class='card'><h2>").append(key).append("</h2>")
             .append("<canvas id='c").append(idx).append("'></canvas></div>");
            idx++;
        }
        h.append("</div>");

        // ── Scripts JavaScript ────────────────────────────────────────────────
        h.append("<script>");

        // Couleurs
        String[] colors = {
            "rgba(33,150,243,.8)", "rgba(76,175,80,.8)", "rgba(255,152,0,.8)",
            "rgba(156,39,176,.8)", "rgba(0,188,212,.8)", "rgba(244,67,54,.8)",
            "rgba(255,193,7,.8)"
        };

        // Chart résumé
        String keysJson = keys.stream()
                .map(k -> "\"" + k.replace("\"", "\\\"") + "\"")
                .collect(Collectors.joining(",", "[", "]"));
        String avgsJson = avgs.stream()
                .map(a -> String.format("%.1f", a))
                .collect(Collectors.joining(",", "[", "]"));
        String bgColors = IntStream.range(0, keys.size())
                .mapToObj(i -> "\"" + colors[i % colors.length] + "\"")
                .collect(Collectors.joining(",", "[", "]"));

        h.append("new Chart(document.getElementById('cSummary'),{type:'bar',data:{labels:")
         .append(keysJson).append(",datasets:[{label:'Temps moyen (ms)',data:").append(avgsJson)
         .append(",backgroundColor:").append(bgColors)
         .append(",borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}},")
         .append("scales:{y:{beginAtZero:true,title:{display:true,text:'Temps (ms)'}}}}});");

        // S5 bar chart
        if (s5Times.length == 4) {
            String s5Data = Arrays.stream(s5Times).mapToObj(Long::toString).collect(Collectors.joining(",", "[", "]"));
            h.append("new Chart(document.getElementById('cS5'),{type:'bar',data:{labels:[")
             .append("'Clients','Questionnaires','Réponses','Gestionnaires'")
             .append("],datasets:[{label:'COUNT (ms)',data:").append(s5Data)
             .append(",backgroundColor:['rgba(33,150,243,.7)','rgba(76,175,80,.7)','rgba(255,152,0,.7)','rgba(156,39,176,.7)'],borderRadius:6}]},")
             .append("options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,title:{display:true,text:'ms'}}}}});");
        }

        // Courbes individuelles (line charts)
        idx = 0;
        for (Map.Entry<String, long[]> entry : chartData.entrySet()) {
            long[] ms = entry.getValue();
            String xLabels = IntStream.rangeClosed(1, ms.length)
                    .mapToObj(Integer::toString)
                    .collect(Collectors.joining(",", "[", "]"));
            String yData = Arrays.stream(ms).mapToObj(Long::toString).collect(Collectors.joining(",", "[", "]"));

            long[] s = Arrays.stream(ms).filter(v -> v >= 0).sorted().toArray();
            double avg = s.length > 0 ? Arrays.stream(s).average().orElse(0) : 0;
            String avgLine = Collections.nCopies(ms.length, String.format("%.1f", avg))
                    .stream().collect(Collectors.joining(",", "[", "]"));

            String color = colors[idx % colors.length];
            h.append("new Chart(document.getElementById('c").append(idx).append("'),{type:'line',data:{labels:")
             .append(xLabels).append(",datasets:[")
             .append("{label:'Temps (ms)',data:").append(yData).append(",borderColor:'").append(color)
             .append("',backgroundColor:'").append(color.replace(".8", ".1")).append("',tension:0.3,pointRadius:3,fill:true},")
             .append("{label:'Moyenne (").append(String.format("%.0f", avg)).append(" ms)',data:").append(avgLine)
             .append(",borderColor:'rgba(244,67,54,.8)',borderDash:[6,3],pointRadius:0,borderWidth:2}]},")
             .append("options:{responsive:true,plugins:{legend:{position:'top'}},scales:{y:{beginAtZero:true,title:{display:true,text:'ms'}}}}});");
            idx++;
        }

        h.append("</script></body></html>");
        return h.toString();
    }
}
