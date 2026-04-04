package com.example.backend.controller;

import com.example.backend.models.Client;
import com.example.backend.service.EnvoiService;
import com.example.backend.Repository.ClientRepository;
import org.springframework.beans.factory.annotation.Autowired;
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
}