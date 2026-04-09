package com.example.backend.service;

import com.example.backend.Repository.AdministrateurRepository;
import com.example.backend.Repository.GestionnaireRepository;
import com.example.backend.models.Administrateur;
import com.example.backend.models.Gestionnaire;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetService {

    @Autowired private AdministrateurRepository administrateurRepository;
    @Autowired private GestionnaireRepository gestionnaireRepository;
    @Autowired private JavaMailSender mailSender;
    @Autowired private NotificationService notificationService;
    @Autowired private PasswordEncoder passwordEncoder;

    public boolean sendResetEmail(String email) {
        Administrateur admin = administrateurRepository.findByEmail(email);
        if (admin != null) {
            sendEmail(email, admin.getFullName());
            return true;
        }
        Gestionnaire gestionnaire = gestionnaireRepository.findByEmail(email);
        if (gestionnaire != null) {
            // Send confirmation email to gestionnaire
            sendEmail(email, gestionnaire.getFullName());
            // Create admin notification
            notificationService.createNotification(
                "DEMANDE_MOT_DE_PASSE",
                "🔑 " + gestionnaire.getFullName() + " (" + email + ") demande une réinitialisation de mot de passe.",
                gestionnaire.getId(),
                "GESTIONNAIRE"
            );
            return true;
        }
        return false;
    }

    public boolean resetPassword(Long gestionnaireId, String newPassword) {
        Gestionnaire gestionnaire = gestionnaireRepository.findById(gestionnaireId).orElse(null);
        if (gestionnaire == null) return false;
        gestionnaire.setPassword(passwordEncoder.encode(newPassword));
        gestionnaireRepository.save(gestionnaire);
        // Notify gestionnaire by email
        sendPasswordChangedEmail(gestionnaire.getEmail(), gestionnaire.getFullName(), newPassword);
        // Remove the pending notification
        notificationService.deleteBySource(gestionnaireId, "GESTIONNAIRE");
        return true;
    }

    private void sendEmail(String toEmail, String name) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("STAR Assurances - Réinitialisation de votre mot de passe");
        message.setText(
            "Bonjour " + name + ",\n\n" +
            "Votre demande de réinitialisation de mot de passe a été transmise à l'administrateur.\n" +
            "Vous recevrez un email dès que votre mot de passe sera réinitialisé.\n\n" +
            "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\n" +
            "Cordialement,\n" +
            "L'équipe STAR Assurances");
        mailSender.send(message);
    }

    private void sendPasswordChangedEmail(String toEmail, String name, String newPassword) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("STAR Assurances - Votre nouveau mot de passe");
            message.setText(
                "Bonjour " + name + ",\n\n" +
                "L'administrateur a réinitialisé votre mot de passe.\n\n" +
                "Votre nouveau mot de passe : " + newPassword + "\n\n" +
                "Nous vous recommandons de le changer dès votre prochaine connexion.\n\n" +
                "Cordialement,\n" +
                "L'équipe STAR Assurances");
            mailSender.send(message);
        } catch (Exception ignored) {}
    }
}
