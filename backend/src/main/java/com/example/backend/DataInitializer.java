package com.example.backend;

import com.example.backend.Repository.AdministrateurRepository;
import com.example.backend.Repository.GestionnaireRepository;
import com.example.backend.models.Administrateur;
import com.example.backend.models.Gestionnaire;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired private AdministrateurRepository adminRepo;
    @Autowired private GestionnaireRepository gestRepo;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        try {
            // Ensure admin password is BCrypt-encoded
            Administrateur admin = adminRepo.findByFullNameIgnoreCase("Admin");
            if (admin != null) {
                String pwd = admin.getPassword();
                boolean isBcrypt = pwd != null && (pwd.startsWith("$2a$") || pwd.startsWith("$2b$") || pwd.startsWith("$2y$"));
                if (!isBcrypt) {
                    admin.setPassword(passwordEncoder.encode(pwd != null ? pwd : "admin"));
                    adminRepo.save(admin);
                    System.out.println("[INIT] Admin password encoded to BCrypt.");
                }
            }
        } catch (Exception e) {
            System.err.println("[INIT] Failed to update admin password: " + e.getMessage());
        }

        try {
            // Always ensure the default gestionnaire account exists
            Gestionnaire existing = gestRepo.findByFullNameIgnoreCase("Gestionnaire");
            if (existing == null) {
                Gestionnaire g = new Gestionnaire();
                g.setFullName("Gestionnaire");
                g.setEmail("gestionnaire@star.com");
                g.setPassword(passwordEncoder.encode("gestionnaire123"));
                gestRepo.save(g);
                System.out.println("[INIT] Default gestionnaire created — login: 'Gestionnaire' / 'gestionnaire123'");
            } else {
                System.out.println("[INIT] Default gestionnaire already exists.");
            }
        } catch (Exception e) {
            System.err.println("[INIT] Failed to create default gestionnaire: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
