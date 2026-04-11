package com.example.backend.controller;

import com.example.backend.models.ClientKpi;
import com.example.backend.Repository.ClientKpiRepository;
import com.example.backend.service.KpiCalculatorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/kpi")
@CrossOrigin(origins = "http://localhost:4200")
public class KpiController {

    @Autowired private KpiCalculatorService kpiService;
    @Autowired private ClientKpiRepository kpiRepo;

    @PostMapping("/calculate/{clientId}/{questionnaireId}")
    public ResponseEntity<ClientKpi> calculate(
            @PathVariable Long clientId,
            @PathVariable Long questionnaireId) {
        return ResponseEntity.ok(
            kpiService.calculateKpi(clientId, questionnaireId));
    }

    @GetMapping("/client/{clientId}")
    public ResponseEntity<List<ClientKpi>> getByClient(
            @PathVariable Long clientId) {
        return ResponseEntity.ok(kpiRepo.findByClientId(clientId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClientKpi> getById(@PathVariable Long id) {
        return ResponseEntity.ok(kpiRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("KPI not found")));
    }
}
