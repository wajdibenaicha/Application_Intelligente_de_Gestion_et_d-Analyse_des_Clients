package com.example.backend.controller;

import com.example.backend.models.Client;
import com.example.backend.service.ClientService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clients")
@CrossOrigin(origins = "http://localhost:4200")
public class ClientController {

    @Autowired
    private ClientService clientService;

    @GetMapping
    public ResponseEntity<List<Client>> getAllClients() {
        return ResponseEntity.ok(clientService.getAllClients());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Client> getClientById(@PathVariable Long id) {
        Client client = clientService.getClientById(id);
        if (client != null) {
            return ResponseEntity.ok(client);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> addClient(@RequestBody Client client) {
        if ((client.getMail() == null || client.getMail().isBlank()) &&
            (client.getTel() == null || client.getTel().isBlank())) {
            return ResponseEntity.badRequest().body("Au moins un email ou un téléphone est requis.");
        }
        Client savedClient = clientService.addClient(client);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedClient);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateClient(@PathVariable Long id, @RequestBody Client client) {
        if ((client.getMail() == null || client.getMail().isBlank()) &&
            (client.getTel() == null || client.getTel().isBlank())) {
            return ResponseEntity.badRequest().body("Au moins un email ou un téléphone est requis.");
        }
        Client updatedClient = clientService.updateClient(id, client);
        if (updatedClient != null) {
            return ResponseEntity.ok(updatedClient);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Client> deleteClient(@PathVariable Long id) {
        Client deletedClient = clientService.deleteClient(id);
        if (deletedClient != null) {
            return ResponseEntity.ok(deletedClient);
        }
        return ResponseEntity.notFound().build();
    }
}
