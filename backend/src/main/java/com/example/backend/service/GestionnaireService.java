package com.example.backend.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.backend.Repository.GestionnaireRepository;
import com.example.backend.models.Gestionnaire;

@Service
public class GestionnaireService {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private GestionnaireRepository gestionnaireRepository;

    public List<Gestionnaire> getAllGestionnaires() {
        return gestionnaireRepository.findAll();
    }

    public Gestionnaire login(String fullName, String password) {
        return gestionnaireRepository.findByFullNameAndPassword(fullName, password);
    }

    public Gestionnaire findByEmail(String email) {
        return gestionnaireRepository.findByEmail(email);
    }

    public Gestionnaire getGestionnaireById(Long id) {
        return gestionnaireRepository.findById(id).orElse(null);
    }

    public Gestionnaire addGestionnaire(Gestionnaire gestionnaire) {
         Gestionnaire saved= gestionnaireRepository.save(gestionnaire);
        messagingTemplate.convertAndSend("/topic/gestionnaires", getAllGestionnaires());
        return saved;
    }

    public Gestionnaire updateGestionnaire(Long id, Gestionnaire gestionnaire) {
        Gestionnaire existing = getGestionnaireById(id);
        if (existing != null) {
            if (gestionnaire.getEmail() != null) existing.setEmail(gestionnaire.getEmail());
            if (gestionnaire.getPassword() != null && !gestionnaire.getPassword().isEmpty()) existing.setPassword(gestionnaire.getPassword());
            if (gestionnaire.getRole() != null) existing.setRole(gestionnaire.getRole());
            if (gestionnaire.getFullName() != null) existing.setFullName(gestionnaire.getFullName());
             Gestionnaire updated = gestionnaireRepository.save(existing);
            messagingTemplate.convertAndSend("/topic/gestionnaires", getAllGestionnaires());
            return updated;
        }
        return null;
    }

    public Gestionnaire deleteGestionnaire(Long id) {
        Gestionnaire existing = getGestionnaireById(id);
        if (existing != null) {
            gestionnaireRepository.delete(existing);
            messagingTemplate.convertAndSend("/topic/gestionnaires", getAllGestionnaires());
            return existing;
        }
        return null;
    }
}
