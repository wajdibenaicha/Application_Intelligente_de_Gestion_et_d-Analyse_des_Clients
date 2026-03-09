package com.example.backend.service;

import com.example.backend.Repository.AdministrateurRepository;
import com.example.backend.models.Administrateur;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service

public class AdministrateurService {
    @Autowired
    private AdministrateurRepository administrateurRepository;

    public List<Administrateur> getAllAdministrateurs() {
        return administrateurRepository.findAll();
    }

    public Administrateur getAdministrateurById(Long id) {
        return administrateurRepository.findById(id).orElse(null);
    }

    public Administrateur addAdministrateur(Administrateur administrateur) {
        return administrateurRepository.save(administrateur);
    }

    public Administrateur updateAdministrateur(Long id, Administrateur administrateur) {
        Administrateur exAd = getAdministrateurById(id);
        if (exAd != null) {
            administrateur.setId(id);
            return administrateurRepository.save(administrateur);
        } else {
            return null;
        }
    }

    public Administrateur deleteAdministrateur(Long id) {
        Administrateur exAd = getAdministrateurById(id);
        if (exAd != null) {
            administrateurRepository.deleteById(id);
            return exAd;
        } else {
            return null;
        }
    }

    public Administrateur login(String full_name, String password) {
        return administrateurRepository.findByFull_nameAndPassword(full_name, password);
    }

}
