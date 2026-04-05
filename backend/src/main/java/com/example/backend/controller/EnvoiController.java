package com.example.backend.controller;

import com.example.backend.models.Client;
import com.example.backend.models.Questionnaire;
import com.example.backend.service.EnvoiService;
import com.example.backend.Repository.ClientRepository;
import com.example.backend.service.QuestionnaireService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/envoi")
@CrossOrigin(origins = "http://localhost:4200")
public class EnvoiController {
    @Autowired
    private EnvoiService envoiService;
    @Autowired
    private ClientRepository clientRepository;
    @Autowired
    private QuestionnaireService questionnaireService;

    @GetMapping("/clients")
    public List<Client> filtrerClients(@RequestParam(required = false) String typeContrat,
            @RequestParam(required = false) Integer anneeMin,
            @RequestParam(required = false) String profession) {
        return envoiService.filtrerClients(typeContrat, anneeMin, profession);
    }

    @PostMapping("/generer-lien")
    public String genererLien(@RequestParam Long questionnaireId, @RequestParam Long clientId) {
        return envoiService.genererLienChiffre(questionnaireId, clientId);
    }

    @GetMapping("/questionnaire")
    public ResponseEntity<Questionnaire> getQuestionnaireByToken(@RequestParam String token) {
        Long questionnaireId = envoiService.dechiffrerToken(token);
        if (questionnaireId == null) {
            return ResponseEntity.badRequest().build();
        }
        Questionnaire q = questionnaireService.getQuestionnaireById(questionnaireId);
        if (q == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(q);
    }
}