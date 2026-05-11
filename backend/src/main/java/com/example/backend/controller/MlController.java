package com.example.backend.controller;

import com.example.backend.models.Client;
import com.example.backend.Repository.ClientRepository;
import com.example.backend.service.MlService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/ml")
public class MlController {

    @Autowired private MlService mlService;
    @Autowired private ClientRepository clientRepo;

    // ── Health check ML service ───────────────────────────────────────────────

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean alive = mlService.isAlive();
        return ResponseEntity.ok(Map.of(
            "mlServiceUp", alive,
            "message", alive ? "ML service opérationnel" : "ML service non disponible — démarrez ml-service/app.py"
        ));
    }

    // ── Segment d'un client ───────────────────────────────────────────────────

    @GetMapping("/clients/{id}/segment")
    public ResponseEntity<?> getClientSegment(@PathVariable Long id) {
        Client client = clientRepo.findById(id).orElse(null);
        if (client == null) return ResponseEntity.notFound().build();
        Map<String, Object> result = mlService.predictSegment(client);
        result.put("client_id",   id);
        result.put("client_name", client.getFullName());
        return ResponseEntity.ok(result);
    }

    // ── Tous les clients avec leur segment ────────────────────────────────────

    @GetMapping("/clients/segments")
    public ResponseEntity<List<Map<String, Object>>> getAllSegments() {
        List<Client> clients = clientRepo.findAll();
        List<Map<String, Object>> results = new ArrayList<>();
        for (Client client : clients) {
            Map<String, Object> seg = new HashMap<>(mlService.predictSegment(client));
            seg.put("client_id",           client.getId());
            seg.put("client_name",         client.getFullName());
            seg.put("client_mail",         client.getMail());
            seg.put("client_type_contrat", client.getTypeContrat());
            results.add(seg);
        }
        return ResponseEntity.ok(results);
    }

    // ── Segments de TOUS les clients DB (bulk — vrais clients MySQL) ─────────

    @GetMapping("/clients/db-segments")
    public ResponseEntity<Map<String, Object>> getDbSegments() {
        return ResponseEntity.ok(mlService.getDbClientSegments());
    }

    // ── Scatter plot PCA ──────────────────────────────────────────────────────

    @GetMapping("/clusters/visualization")
    public ResponseEntity<Map<String, Object>> visualization() {
        return ResponseEntity.ok(mlService.getClustersVisualization());
    }

    // ── Cards profils segments ────────────────────────────────────────────────

    @GetMapping("/clusters/profiles")
    public ResponseEntity<Map<String, Object>> profiles() {
        return ResponseEntity.ok(mlService.getClustersProfiles());
    }
}
