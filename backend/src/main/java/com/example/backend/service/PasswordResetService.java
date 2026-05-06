package com.example.backend.service;

import com.example.backend.Repository.AdministrateurRepository;
import com.example.backend.Repository.GestionnaireRepository;
import com.example.backend.models.Gestionnaire;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PasswordResetService {

    @Autowired private AdministrateurRepository administrateurRepository;
    @Autowired private GestionnaireRepository gestionnaireRepository;
    @Autowired private JavaMailSender mailSender;
    @Autowired private PasswordEncoder passwordEncoder;

    private record OtpEntry(String code, Instant expiresAt, int attempts) {}
    private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();
    private static final long OTP_TTL_SECONDS = 600;
    private static final int MAX_ATTEMPTS = 5;

    public boolean sendOtp(String email) {
        boolean exists = gestionnaireRepository.findByEmail(email) != null
                || administrateurRepository.findByEmail(email) != null;
        if (!exists) return false;

        String code = String.format("%06d", new Random().nextInt(1_000_000));
        otpStore.put(email.toLowerCase(), new OtpEntry(code, Instant.now().plusSeconds(OTP_TTL_SECONDS), 0));
        sendOtpEmail(email, code);
        return true;
    }

    public boolean verifyOtp(String email, String code) {
        OtpEntry entry = otpStore.get(email.toLowerCase());
        if (entry == null) return false;
        if (Instant.now().isAfter(entry.expiresAt())) { otpStore.remove(email.toLowerCase()); return false; }
        if (entry.attempts() >= MAX_ATTEMPTS) { otpStore.remove(email.toLowerCase()); return false; }
        if (!entry.code().equals(code)) {
            otpStore.put(email.toLowerCase(), new OtpEntry(entry.code(), entry.expiresAt(), entry.attempts() + 1));
            return false;
        }
        return true;
    }

    public boolean resetWithOtp(String email, String code, String newPassword) {
        if (!verifyOtp(email, code)) return false;
        otpStore.remove(email.toLowerCase());

        Gestionnaire gestionnaire = gestionnaireRepository.findByEmail(email);
        if (gestionnaire != null) {
            gestionnaire.setPassword(passwordEncoder.encode(newPassword));
            gestionnaireRepository.save(gestionnaire);
            return true;
        }
        var admin = administrateurRepository.findByEmail(email);
        if (admin != null) {
            admin.setPassword(passwordEncoder.encode(newPassword));
            administrateurRepository.save(admin);
            return true;
        }
        return false;
    }

    private void sendOtpEmail(String toEmail, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("STAR Assurances - Code de vérification");
            String html = emailHtml(
                "<p style='margin:0 0 24px;font-size:15px;color:#e8f5ee;line-height:1.7;'>Votre code de vérification pour réinitialiser votre mot de passe est :</p>" +
                "<div style='background:rgba(0,0,0,0.2);border-radius:12px;padding:24px 40px;" +
                "text-align:center;margin:0 0 24px;letter-spacing:12px;font-size:38px;font-weight:700;color:#bbd003;border:2px solid rgba(187,208,3,0.4);'>" +
                code + "</div>" +
                "<p style='margin:0 0 8px;font-size:14px;color:#c8e6c9;'>Ce code est valable <strong style='color:#ffffff;'>10 minutes</strong>.</p>" +
                "<p style='margin:0;font-size:14px;color:#c8e6c9;'>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>"
            );
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Erreur envoi email OTP", e);
        }
    }

    private static String emailHtml(String content) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'/>" +
            "<style>body{margin:0;padding:0;font-family:Arial,sans-serif;}</style></head>" +
            "<body style='margin:0;padding:0;background:#1a5c38;'>" +
            "<table width='100%' cellpadding='0' cellspacing='0' style='background:" +
            "linear-gradient(160deg,#1a5c38 0%,#27ae60 100%);min-height:100vh;'><tr><td align='center' style='padding:40px 16px;'>" +
            "<table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;width:100%;'>" +
            "<tr><td style='padding-bottom:32px;'>" +
            "<img src='https://mystar.star.com.tn/assets/img/logo-color.svg' alt='STAR Assurances' height='50' " +
            "onerror=\"this.style.display='none'\" style='height:50px;'/>" +
            "<p style='margin:4px 0 0;font-size:11px;color:#bbd003;letter-spacing:3px;text-transform:uppercase;'>STAR Assurances</p>" +
            "</td></tr>" +
            "<tr><td style='padding-bottom:24px;'>" +
            "<h2 style='margin:0;font-size:22px;font-weight:700;color:#ffffff;'>Réinitialisation de mot de passe</h2>" +
            "</td></tr>" +
            "<tr><td>" + content + "</td></tr>" +
            "<tr><td style='padding-top:36px;border-top:1px solid rgba(255,255,255,0.2);margin-top:36px;'>" +
            "<p style='margin:0;font-size:13px;color:#a5d6a7;line-height:1.6;'>Cordialement,<br/>" +
            "<strong style='color:#ffffff;'>STAR Assurances</strong></p>" +
            "</td></tr>" +
            "</table></td></tr></table></body></html>";
    }

    /** kept for admin-reset flow from dashboard */
    public boolean resetPassword(Long gestionnaireId, String newPassword) {
        Gestionnaire gestionnaire = gestionnaireRepository.findById(gestionnaireId).orElse(null);
        if (gestionnaire == null) return false;
        gestionnaire.setPassword(passwordEncoder.encode(newPassword));
        gestionnaireRepository.save(gestionnaire);
        return true;
    }
}
