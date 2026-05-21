package com.example.backend;

import com.example.backend.Repository.AdministrateurRepository;
import com.example.backend.Repository.PermissionRepository;
import com.example.backend.models.Administrateur;
import com.example.backend.models.Permission;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired private AdministrateurRepository adminRepo;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private PermissionRepository permissionRepo;

    // ── 5 permissions prédéfinies — fixes, non modifiables par l'admin ───────
    private static final List<String> DEFAULT_PERMISSIONS = List.of(
        "Gérer les questionnaires",
        "Gérer les offres",
        "Supprimer une réponse"
    );

    @Override
    public void run(String... args) {
        initAdmin();
        initPermissions();
    }

    private void initAdmin() {
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

    private void initPermissions() {
        try {
            int created = 0;
            for (String desc : DEFAULT_PERMISSIONS) {
                if (permissionRepo.findByDescription(desc).isEmpty()) {
                    Permission p = new Permission();
                    p.setDescription(desc);
                    permissionRepo.save(p);
                    created++;
                }
            }
            if (created > 0)
                System.out.println("[INIT] " + created + " permission(s) prédéfinie(s) créée(s).");
            else
                System.out.println("[INIT] Permissions déjà initialisées.");
        } catch (Exception e) {
            System.err.println("[INIT] Erreur permissions: " + e.getMessage());
        }
    }
}
