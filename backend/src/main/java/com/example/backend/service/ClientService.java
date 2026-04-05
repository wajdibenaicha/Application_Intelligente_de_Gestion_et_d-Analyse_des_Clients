package com.example.backend.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.backend.Repository.ClientRepository;
import com.example.backend.models.Client;

@Service

public class ClientService {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ClientRepository clientRepository;

    public List<Client> getAllClients() {
        return clientRepository.findAll();
    }

    public Client getClientById(Long id) {
        return clientRepository.findById(id).orElse(null);
    }

    public Client addClient(Client client) {
        Client saved = clientRepository.save(client);
        messagingTemplate.convertAndSend("/topic/clients", getAllClients());
        return saved;
    }

    public Client updateClient(Long id, Client client) {
        Client exist = getClientById(id);
        if (exist == null) return null;
        client.setId(id);
        Client updated = clientRepository.save(client);
        messagingTemplate.convertAndSend("/topic/clients", getAllClients());
        return updated;
    }

    public Client deleteClient(Long id) {
        Client exist = getClientById(id);
        if (exist == null) return null;
        clientRepository.delete(exist);
        messagingTemplate.convertAndSend("/topic/clients", getAllClients());
        return exist;
    }

}
