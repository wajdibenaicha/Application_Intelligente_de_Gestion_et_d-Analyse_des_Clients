package com.example.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.Repository.ClientRepository;
import com.example.backend.Repository.EnvoiQuestionnaireRepository;
import com.example.backend.Repository.QuestionnaireRepository;
import com.example.backend.models.Client;
import com.example.backend.models.EnvoiQuestionnaire;
import com.example.backend.models.Questionnaire;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;

@Service
public class QuestionnaireDistributionService {

    @Autowired private EnvoiQuestionnaireRepository envoiRepo;
    @Autowired private QuestionnaireRepository questionnaireRepo;
    @Autowired private ClientRepository clientRepo;
    @Autowired private JavaMailSender mailSender;
    @Autowired private TokenEncryptionService tokenService;

    @Value("${twilio.phone-number}")
    private String twilioPhone;

    @Transactional
    public void distribute(Long questionnaireId, List<DistributionRequest> distributions) {
        Questionnaire q = questionnaireRepo.findById(questionnaireId).orElseThrow();

        if (!"PUBLIE".equals(q.getStatut())) {
            throw new RuntimeException("Only PUBLIE questionnaires can be sent");
        }

        for (DistributionRequest d : distributions) {
            Client client = clientRepo.findById(d.getClientId()).orElseThrow();
            String token = tokenService.encrypt(questionnaireId + ":" + d.getClientId());

        
            boolean hasEmail = client.getMail() != null && !client.getMail().isBlank();
            boolean hasTel   = client.getTel()  != null && !client.getTel().isBlank();
            String effectiveChannel;
            if ("sms".equals(d.getChannel())) {
                effectiveChannel = hasTel ? "sms" : (hasEmail ? "email" : null);
            } else {
                effectiveChannel = hasEmail ? "email" : (hasTel ? "sms" : null);
            }

            if (effectiveChannel == null) continue;

            EnvoiQuestionnaire envoi = new EnvoiQuestionnaire();
            envoi.setQuestionnaireId(questionnaireId);
            envoi.setClientId(d.getClientId());
            envoi.setToken(token);
            envoi.setChannel(effectiveChannel);
            envoi.setDateEnvoi(LocalDateTime.now());
            envoiRepo.save(envoi);

            String link = "http://localhost:4200/fill-questionnaire?token=" + token;

            if ("sms".equals(effectiveChannel)) {
                sendSms(client, q, link, d.getCorps());
            } else {
                sendEmail(client, q, link, d.getSujet(), d.getCorps());
            }
        }
    }

    private void sendEmail(Client c, Questionnaire q, String link, String sujet, String corps) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setTo(c.getMail());
            helper.setSubject(sujet != null && !sujet.isBlank() ? sujet : "Questionnaire: " + q.getTitre());
            String clientName = c.getFullName() != null ? c.getFullName() : "";
            String bodyText = corps != null && !corps.isBlank()
                ? corps.replace("{NOM_CLIENT}", clientName)
                : "Veuillez prendre quelques minutes pour remplir ce questionnaire.";
            String html = emailHtml(clientName, q.getTitre(),
                "<p style='margin:0 0 20px;font-size:15px;color:#e8f5ee;line-height:1.7;white-space:pre-line;'>" + bodyText + "</p>" +
                "<div style='text-align:center;margin:28px 0;'>" +
                "<a href='" + link + "' style='display:inline-block;background:#bbd003;color:#1a3d2b;" +
                "padding:14px 36px;border-radius:25px;text-decoration:none;font-weight:700;" +
                "font-size:15px;letter-spacing:0.5px;'>Remplir le questionnaire</a></div>" +
                "<p style='margin:0;font-size:13px;color:#a5d6a7;'>Ce lien est personnel et ne doit pas être partagé.</p>"
            );
            helper.setText(html, true);
            mailSender.send(msg);
        } catch (Exception e) {
            throw new RuntimeException("Erreur envoi email questionnaire", e);
        }
    }

    private static String emailHtml(String clientName, String questionnaireTitre, String content) {
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
            "<tr><td style='padding-bottom:8px;'>" +
            "<p style='margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#bbd003;'>Questionnaire</p>" +
            "<h2 style='margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;'>" + questionnaireTitre + "</h2>" +
            "<p style='margin:0 0 24px;font-size:15px;color:#e8f5ee;'>Bonjour <strong style='color:#ffffff;'>" + clientName + "</strong>,</p>" +
            "</td></tr>" +
            "<tr><td>" + content + "</td></tr>" +
            "<tr><td style='padding-top:36px;border-top:1px solid rgba(255,255,255,0.2);margin-top:36px;'>" +
            "<p style='margin:0;font-size:13px;color:#a5d6a7;line-height:1.6;'>Cordialement,<br/>" +
            "<strong style='color:#ffffff;'>STAR Assurances</strong></p>" +
            "</td></tr>" +
            "</table></td></tr></table></body></html>";
    }

    private void sendSms(Client c, Questionnaire q, String link, String corps) {
        String tel = c.getTel() != null ? c.getTel().replaceAll("\\s+", "") : "";
        if (!tel.startsWith("+")) tel = "+216" + tel;
        String text = corps != null && !corps.isBlank()
            ? corps.replace("{NOM_CLIENT}", c.getFullName() != null ? c.getFullName() : "") + " " + link
            : "Questionnaire \"" + q.getTitre() + "\": " + link;
        Message.creator(
            new PhoneNumber(tel),
            new PhoneNumber(twilioPhone.replaceAll("\\s+", "")),
            text
        ).create();
    }

    public static class DistributionRequest {
        private Long clientId;
        private String channel;
        private String sujet;
        private String corps;

        public Long getClientId() { return clientId; }
        public void setClientId(Long clientId) { this.clientId = clientId; }
        public String getChannel() { return channel; }
        public void setChannel(String channel) { this.channel = channel; }
        public String getSujet() { return sujet; }
        public void setSujet(String sujet) { this.sujet = sujet; }
        public String getCorps() { return corps; }
        public void setCorps(String corps) { this.corps = corps; }
    }
}
