package com.example.backend;

import com.example.backend.Repository.AdministrateurRepository;
import com.example.backend.models.Administrateur;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired private AdministrateurRepository adminRepo;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        try {
            Administrateur admin = adminRepo.findByFullNameIgnoreCase("Admin");
            if (admin == null) {
                admin = new Administrateur();
                admin.setFullName("Admin");
                admin.setEmail("admin@app.com");
                admin.setPassword(passwordEncoder.encode("admin123"));
                adminRepo.save(admin);
                System.out.println("[INIT] Compte admin par défaut créé.");
            } else {
                String pwd = admin.getPassword();
                boolean isBcrypt = pwd != null && (pwd.startsWith("$2a$") || pwd.startsWith("$2b$") || pwd.startsWith("$2y$"));
                if (!isBcrypt) {
                    admin.setPassword(passwordEncoder.encode(pwd != null ? pwd : "admin123"));
                    adminRepo.save(admin);
                    System.out.println("[INIT] Mot de passe admin encodé en BCrypt.");
                }
            }
        } catch (Exception e) {
            System.err.println("[INIT] Erreur admin: " + e.getMessage());
        }

    }
}
