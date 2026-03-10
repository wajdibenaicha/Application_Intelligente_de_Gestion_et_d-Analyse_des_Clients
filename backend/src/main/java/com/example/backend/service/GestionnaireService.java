package com.example.backend.service;

import com.example.backend.Repository.GestionnaireRepository;
import com.example.backend.models.Gestionnaire;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class GestionnaireService {

    @Autowired
    private GestionnaireRepository gestionnaireRepository;

    public Gestionnaire login(String fullName, String password) {
        return gestionnaireRepository.findByFullNameAndPassword(fullName, password);
    }

    public Gestionnaire findByEmail(String email) {
        return gestionnaireRepository.findByEmail(email);
    }
}
