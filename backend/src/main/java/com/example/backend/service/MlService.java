package com.example.backend.service;

import com.example.backend.models.Client;
import com.example.backend.models.ClientKpi;
import com.example.backend.Repository.ClientKpiRepository;
import com.example.backend.Repository.ClientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MlService {

    @Value("${ml.service.url:http://localhost:5000}")
    private String mlUrl;

    private final RestTemplate rest;

    @Autowired
    private ClientKpiRepository kpiRepo;

    @Autowired
    private ClientRepository clientRepo;

    // Encoding type de contrat → score 1-4
    private static final Map<String, Integer> CONTRACT_SCORE = Map.ofEntries(
        Map.entry("BASIQUE", 1), Map.entry("GENERAL", 1), Map.entry("VOYAGE", 1),
        Map.entry("STANDARD", 2), Map.entry("AUTO", 2), Map.entry("HABITATION", 2), Map.entry("SANTE", 2),
        Map.entry("PREMIUM", 3),
        Map.entry("PLATINIUM", 4), Map.entry("VIE", 4)
    );

    public MlService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(60_000);
        this.rest = new RestTemplate(factory);
    }

    // ── Segment d'un client (clustering) ─────────────────────────────────────

    public Map<String, Object> predictSegment(Client client) {
        List<ClientKpi> kpiList = kpiRepo.findByClientId(client.getId());
        double kpiScore = kpiList.isEmpty() ? 50.0
            : kpiList.stream().mapToDouble(ClientKpi::getScore).average().orElse(50.0);

        String lastSentiment = kpiList.isEmpty() ? "NEUTRE"
            : kpiList.stream()
                .max(Comparator.comparing(ClientKpi::getCalculatedAt))
                .map(k -> k.getSentiment().name())
                .orElse("NEUTRE");

        Map<String, Object> body = new HashMap<>();
        body.put("kpi_score",          kpiScore);
        body.put("annee_inscription",  client.getAnneeInscription() != null ? client.getAnneeInscription() : 2020);
        body.put("prime_annuelle",     client.getPrimeAnnuelle()    != null ? client.getPrimeAnnuelle()    : 0.0);
        body.put("type_contrat",       client.getTypeContrat()      != null ? client.getTypeContrat().toUpperCase() : "STANDARD");
        body.put("date_naissance",     client.getDateNaissance()    != null ? client.getDateNaissance().toString() : null);
        body.put("situation_familiale",client.getSituationFamiliale() != null ? client.getSituationFamiliale() : "");
        body.put("profession",         client.getProfession()        != null ? client.getProfession()        : "");
        body.put("adresse",            client.getAdresse()           != null ? client.getAdresse()           : "");
        body.put("sentiment",          lastSentiment);

        return callPost("/predict/segment", body);
    }

    // ── Visualisation scatter plot PCA ────────────────────────────────────────

    public Map<String, Object> getClustersVisualization() {
        return callGet("/clusters/visualization");
    }

    // ── Profils des segments ──────────────────────────────────────────────────

    public Map<String, Object> getClustersProfiles() {
        return callGet("/clusters/profiles");
    }

    // ── Segments de tous les clients DB (1 seul appel bulk Flask) ────────────

    public Map<String, Object> getDbClientSegments() {
        List<Client> clients = clientRepo.findAll();

        List<Map<String, Object>> payloads = clients.stream().map(client -> {
            List<ClientKpi> kpiList = kpiRepo.findByClientId(client.getId());
            double kpiScore = kpiList.isEmpty() ? 50.0
                : kpiList.stream().mapToDouble(ClientKpi::getScore).average().orElse(50.0);
            String lastSentiment = kpiList.isEmpty() ? "NEUTRE"
                : kpiList.stream()
                    .max(Comparator.comparing(ClientKpi::getCalculatedAt))
                    .map(k -> k.getSentiment().name())
                    .orElse("NEUTRE");

            Map<String, Object> body = new HashMap<>();
            body.put("client_id",          client.getId());
            body.put("kpi_score",          kpiScore);
            body.put("annee_inscription",  client.getAnneeInscription()   != null ? client.getAnneeInscription()   : 2020);
            body.put("prime_annuelle",     client.getPrimeAnnuelle()      != null ? client.getPrimeAnnuelle()      : 0.0);
            body.put("type_contrat",       client.getTypeContrat()        != null ? client.getTypeContrat().toUpperCase() : "STANDARD");
            body.put("date_naissance",     client.getDateNaissance()      != null ? client.getDateNaissance().toString() : null);
            body.put("situation_familiale",client.getSituationFamiliale() != null ? client.getSituationFamiliale() : "");
            body.put("profession",         client.getProfession()         != null ? client.getProfession()         : "");
            body.put("adresse",            client.getAdresse()            != null ? client.getAdresse()            : "");
            body.put("sentiment",          lastSentiment);
            return body;
        }).collect(Collectors.toList());

        List<Map<String, Object>> results = predictSegmentsBulk(payloads);

        // Construire : assignments {clientId → segmentId} + metadata segments
        Map<Long, Integer> assignments = new HashMap<>();
        Map<Integer, Map<String, Object>> segMap = new LinkedHashMap<>();

        for (Map<String, Object> r : results) {
            long clientId = ((Number) r.get("client_id")).longValue();
            int  segId    = ((Number) r.get("segment_id")).intValue();
            assignments.put(clientId, segId);
            segMap.computeIfAbsent(segId, id -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id",       id);
                m.put("name",     r.get("segment_name"));
                m.put("color",    r.get("segment_color"));
                m.put("priority", r.get("segment_priority"));
                m.put("size",     0);
                return m;
            });
            segMap.get(segId).put("size", (int) segMap.get(segId).get("size") + 1);
        }

        List<Map<String, Object>> segments = segMap.values().stream()
            .sorted(Comparator.comparingInt(m -> -((int) m.get("size"))))
            .collect(Collectors.toList());

        return Map.of("segments", segments, "assignments", assignments);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> predictSegmentsBulk(List<Map<String, Object>> clients) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<List<Map<String, Object>>> entity = new HttpEntity<>(clients, headers);
            ResponseEntity<List> resp = rest.postForEntity(mlUrl + "/predict/segments/bulk", entity, List.class);
            return resp.getBody() != null ? resp.getBody() : List.of();
        } catch (ResourceAccessException e) {
            return List.of();
        } catch (Exception e) {
            return List.of();
        }
    }

    // ── Health check ──────────────────────────────────────────────────────────

    public boolean isAlive() {
        try {
            rest.getForObject(mlUrl + "/health", Map.class);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // ── Helpers HTTP ──────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> callPost(String path, Map<String, Object> body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> resp = rest.postForEntity(mlUrl + path, entity, Map.class);
            return resp.getBody() != null ? resp.getBody() : Map.of("error", "empty response");
        } catch (ResourceAccessException e) {
            return Map.of("error", "ML service unavailable — démarrez ml-service/app.py");
        } catch (Exception e) {
            return Map.of("error", e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callGet(String path) {
        try {
            Map result = rest.getForObject(mlUrl + path, Map.class);
            return result != null ? result : Map.of("error", "empty response");
        } catch (ResourceAccessException e) {
            return Map.of("error", "ML service unavailable — démarrez ml-service/app.py");
        } catch (Exception e) {
            return Map.of("error", e.getMessage());
        }
    }
}
