package com.example.backend.service;

import com.example.backend.Repository.AdministrateurRepository;
import com.example.backend.Repository.GestionnaireRepository;
import com.example.backend.models.Administrateur;
import com.example.backend.models.Gestionnaire;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetService {

    @Autowired
    private AdministrateurRepository administrateurRepository;

    @Autowired
    private GestionnaireRepository gestionnaireRepository;

    @Autowired
    private JavaMailSender mailSender;

    public boolean sendResetEmail(String email) {

        // Cherche dans la table administrateur
        Administrateur admin = administrateurRepository.findByEmail(email);
        if (admin != null) {
            sendEmail(email, admin.getFullName());
            return true;
        }

        // Cherche dans la table gestionnaire
        Gestionnaire gestionnaire = gestionnaireRepository.findByEmail(email);
        if (gestionnaire != null) {
            sendEmail(email, gestionnaire.getFull_name());
            return true;
        }

        return false; // Email non trouvé
    }

    private void sendEmail(String toEmail, String name) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("STAR Assurances - Réinitialisation de votre mot de passe");
        message.setText(
                "Bonjour " + name + ",\n\n" +
                        "Vous avez demandé une réinitialisation de votre mot de passe.\n\n" +
                        "Veuillez contacter votre administrateur pour procéder à la réinitialisation.\n\n" +
                        "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\n" +
                        "Cordialement,\n" +
                        "L'équipe STAR Assurances");
        mailSender.send(message);
    }
}