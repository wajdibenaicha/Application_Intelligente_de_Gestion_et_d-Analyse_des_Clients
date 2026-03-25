package com.example.backend.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.backend.Repository.GestionnaireRepository;
import com.example.backend.models.Gestionnaire;

@Service
public class GestionnaireService {

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
        return gestionnaireRepository.save(gestionnaire);
    }

    public Gestionnaire updateGestionnaire(Long id, Gestionnaire gestionnaire) {
        Gestionnaire existing = getGestionnaireById(id);
        if (existing != null) {
            gestionnaire.setId(id);
            return gestionnaireRepository.save(gestionnaire);
        }
        return null;
    }

    public Gestionnaire deleteGestionnaire(Long id) {
        Gestionnaire existing = getGestionnaireById(id);
        if (existing != null) {
            gestionnaireRepository.delete(existing);
            return existing;
        }
        return null;
    }
}
