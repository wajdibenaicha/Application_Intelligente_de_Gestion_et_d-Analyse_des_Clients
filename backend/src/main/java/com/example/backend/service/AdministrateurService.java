package com.example.backend.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.example.backend.Repository.AdministrateurRepository;
import com.example.backend.models.Administrateur;

@Service
public class AdministrateurService {

    @Autowired
    private AdministrateurRepository administrateurRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<Administrateur> getAllAdministrateurs() {
        return administrateurRepository.findAll();
    }

    public Administrateur getAdministrateurById(Long id) {
        return administrateurRepository.findById(id).orElse(null);
    }

    public Administrateur addAdministrateur(Administrateur administrateur) {
        administrateur.setPassword(passwordEncoder.encode(administrateur.getPassword()));
        return administrateurRepository.save(administrateur);
    }

    public Administrateur updateAdministrateur(Long id, Administrateur administrateur) {
        Administrateur exAd = getAdministrateurById(id);
        if (exAd != null) {
            administrateur.setId(id);
            if (administrateur.getPassword() != null && !administrateur.getPassword().isEmpty()) {
                administrateur.setPassword(passwordEncoder.encode(administrateur.getPassword()));
            } else {
                administrateur.setPassword(exAd.getPassword());
            }
            return administrateurRepository.save(administrateur);
        }
        return null;
    }

    public Administrateur deleteAdministrateur(Long id) {
        Administrateur exAd = getAdministrateurById(id);
        if (exAd != null) {
            administrateurRepository.deleteById(id);
            return exAd;
        }
        return null;
    }

    public Administrateur login(String fullName, String password) {
        Administrateur admin = administrateurRepository.findByFullNameIgnoreCase(fullName);
        if (admin == null) return null;
        String stored = admin.getPassword();
        boolean isBcrypt = stored != null && (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$"));
        boolean matches = isBcrypt
            ? passwordEncoder.matches(password, stored)
            : password.equals(stored);
        if (matches) {
            if (!isBcrypt) {
                admin.setPassword(passwordEncoder.encode(password));
                administrateurRepository.save(admin);
            }
            return admin;
        }
        return null;
    }
}