package performance;

import com.example.backend.Repository.*;
import com.example.backend.models.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.*;

/**
 * Tests de performance SQL — MySQL via Spring Data JPA
 * Copier dans backend/src/test/java/com/example/backend/performance/ pour exécuter.
 * Lancer : ./mvnw test -Dtest=PerformanceSqlTest
 * Prérequis : base base_de_donnee accessible avec des données existantes.
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

    // ── Utilitaires ──────────────────────────────────────────────────────────

    private long timeMs(ThrowingRunnable action) {
        long t = System.nanoTime();
        try { action.run(); } catch (Exception e) { System.err.println("Erreur : " + e.getMessage()); }
        return (System.nanoTime() - t) / 1_000_000;
    }

    private void printStats(String title, long[] ms) {
        long[] s = Arrays.stream(ms).sorted().toArray();
        double avg = Arrays.stream(s).average().orElse(0);
        System.out.printf("%n┌─ %s%n", title);
        System.out.printf("│  Exécutions : %d  |  Min : %d ms  |  Max : %d ms%n", s.length, s[0], s[s.length - 1]);
        System.out.printf("│  Moyenne    : %.2f ms  |  P95 : %d ms%n", avg, s[(int)(s.length * 0.95)]);
        System.out.printf("└─────────────────────────────────────────────────%n");
    }

    @FunctionalInterface interface ThrowingRunnable { void run() throws Exception; }

    // ─────────────────────────────────────────────────────────────────────────
    //  S1 — SELECT all clients (temps de lecture)
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(1)
    @DisplayName("S1 — SELECT tous les clients (30 répétitions)")
    void s1_select_all_clients() {
        int n = 30;
        long[] ms = new long[n];
        for (int i = 0; i < n; i++)
            ms[i] = timeMs(() -> clientRepo.findAll());

        printStats("S1 — clientRepo.findAll()  [n=" + n + "]", ms);
        System.out.println("     Nombre de clients en base : " + clientRepo.count());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  S2 — SELECT clients par email (recherche indexée vs non-indexée)
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(2)
    @DisplayName("S2 — Recherche client par email (20 répétitions)")
    void s2_recherche_client_email() {
        // Récupère un email existant
        List<Client> all = clientRepo.findAll();
        Assumptions.assumeFalse(all.isEmpty(), "Aucun client en base");
        String email = all.get(0).getMail();

        int n = 20;
        long[] ms = new long[n];
        for (int i = 0; i < n; i++)
            ms[i] = timeMs(() -> clientRepo.findByMail(email));

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
        for (int i = 0; i < n; i++)
            ms[i] = timeMs(() -> questionnaireRepo.findByGestionnaireId(gestId));

        printStats("S3 — questionnaireRepo.findByGestionnaireId()  [n=" + n + "]", ms);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  S4 — SELECT réponses par questionnaire (jointure)
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(4)
    @DisplayName("S4 — SELECT réponses par questionnaire (jointure, 20 répétitions)")
    void s4_reponses_par_questionnaire() {
        List<Questionnaire> qs = questionnaireRepo.findAll();
        Assumptions.assumeFalse(qs.isEmpty(), "Aucun questionnaire en base");
        Long qId = qs.get(0).getId();

        int n = 20;
        long[] ms = new long[n];
        for (int i = 0; i < n; i++)
            ms[i] = timeMs(() -> reponseRepo.findByQuestionnaireId(qId));

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

        System.out.printf("│  COUNT clients        : %d ms  (%d enregistrements)%n", t1, clientRepo.count());
        System.out.printf("│  COUNT questionnaires : %d ms  (%d enregistrements)%n", t2, questionnaireRepo.count());
        System.out.printf("│  COUNT réponses       : %d ms  (%d enregistrements)%n", t3, reponseRepo.count());
        System.out.printf("│  COUNT gestionnaires  : %d ms  (%d enregistrements)%n", t4, gestionnaireRepo.count());
        System.out.println("└─────────────────────────────────────────────────");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  S6 — INSERT concurrent (simulation envoi de réponses simultanées)
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(6)
    @DisplayName("S6 — INSERT concurrent clients (10 threads, 5 inserts chacun)")
    @Transactional
    void s6_insert_concurrent_clients() throws InterruptedException {
        int workers = 10;
        int perThread = 5;
        List<Long> insertTimes = Collections.synchronizedList(new ArrayList<>());

        ExecutorService pool = Executors.newFixedThreadPool(workers);
        List<Future<?>> futures = new ArrayList<>();

        for (int w = 0; w < workers; w++) {
            final int wId = w;
            futures.add(pool.submit(() -> {
                for (int i = 0; i < perThread; i++) {
                    Client c = new Client();
                    c.setFullName("Test-" + wId + "-" + i);
                    c.setMail("test" + wId + i + System.nanoTime() + "@perf.com");
                    c.setTel("0000000000");
                    c.setNumeroContrat("PERF-" + wId + "-" + i);
                    c.setTypeContrat("AUTO");
                    c.setAnneeInscription(2020);
                    c.setPrimeAnnuelle(1000.0);

                    long t = System.nanoTime();
                    clientRepo.save(c);
                    insertTimes.add((System.nanoTime() - t) / 1_000_000);
                }
            }));
        }

        pool.shutdown();
        pool.awaitTermination(60, TimeUnit.SECONDS);
        for (Future<?> f : futures) {
            try { f.get(); } catch (ExecutionException e) { System.err.println("Erreur insert : " + e.getCause().getMessage()); }
        }

        long[] ms = insertTimes.stream().mapToLong(Long::longValue).toArray();
        printStats("S6 — INSERT concurrent clients  [" + workers + " threads × " + perThread + " inserts]", ms);
        System.out.println("     Total inserts réussis : " + ms.length);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  S7 — Permissions : lecture roles + permissions (EAGER loading)
    // ─────────────────────────────────────────────────────────────────────────

    @Test @Order(7)
    @DisplayName("S7 — Chargement rôles + permissions (EAGER, 30 répétitions)")
    void s7_roles_permissions_eager() {
        int n = 30;
        long[] ms = new long[n];
        for (int i = 0; i < n; i++)
            ms[i] = timeMs(() -> roleRepo.findAll());

        printStats("S7 — roleRepo.findAll() avec permissions EAGER  [n=" + n + "]", ms);
        System.out.println("     Rôles en base : " + roleRepo.count()
                + "  |  Permissions : " + permissionRepo.count());
    }
}
