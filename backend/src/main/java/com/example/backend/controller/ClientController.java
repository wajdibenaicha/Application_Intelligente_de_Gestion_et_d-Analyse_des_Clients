package com.example.backend.controller;

import com.example.backend.models.Client;
import com.example.backend.service.ClientService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clients")
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
        if (client != null) return ResponseEntity.ok(client);
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> addClient(@Valid @RequestBody Client client) {
        if ((client.getMail() == null || client.getMail().isBlank()) &&
            (client.getTel() == null || client.getTel().isBlank())) {
            return ResponseEntity.badRequest().body("Au moins un email ou un téléphone est requis.");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(clientService.addClient(client));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateClient(@PathVariable Long id, @Valid @RequestBody Client client) {
        if ((client.getMail() == null || client.getMail().isBlank()) &&
            (client.getTel() == null || client.getTel().isBlank())) {
            return ResponseEntity.badRequest().body("Au moins un email ou un téléphone est requis.");
        }
        Client updated = clientService.updateClient(id, client);
        if (updated != null) return ResponseEntity.ok(updated);
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Client> deleteClient(@PathVariable Long id) {
        Client deleted = clientService.deleteClient(id);
        if (deleted != null) return ResponseEntity.ok(deleted);
        return ResponseEntity.notFound().build();
    }
}
