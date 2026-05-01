package com.example.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
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
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(c.getMail());
        msg.setSubject(sujet != null && !sujet.isBlank() ? sujet : "Questionnaire: " + q.getTitre());
        String body = corps != null && !corps.isBlank()
            ? corps.replace("{NOM_CLIENT}", c.getFullName() != null ? c.getFullName() : "") + "\n\n" + link
            : "Bonjour " + c.getFullName() + ",\n\nVeuillez remplir ce questionnaire:\n" + link + "\n\nMerci.";
        msg.setText(body);
        mailSender.send(msg);
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
