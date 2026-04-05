package com.example.backend.service;

import com.example.backend.models.*;
import com.example.backend.Repository.*;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

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

            EnvoiQuestionnaire envoi = new EnvoiQuestionnaire();
            envoi.setQuestionnaireId(questionnaireId);
            envoi.setClientId(d.getClientId());
            envoi.setToken(token);
            envoi.setChannel(d.getChannel());
            envoi.setDateEnvoi(LocalDateTime.now());
            envoiRepo.save(envoi);

            String link = "http://localhost:4200/fill-questionnaire?token=" + token;

            if ("sms".equals(d.getChannel())) {
                sendSms(client, q, link);
            } else {
                sendEmail(client, q, link);
            }
        }
    }

    private void sendEmail(Client c, Questionnaire q, String link) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(c.getMail());
        msg.setSubject("Questionnaire: " + q.getTitre());
        msg.setText("Bonjour " + c.getFullName() + ",\n\nVeuillez remplir ce questionnaire:\n" + link + "\n\nMerci.");
        mailSender.send(msg);
    }

    private void sendSms(Client c, Questionnaire q, String link) {
        Message.creator(
            new PhoneNumber(c.getTel()),
            new PhoneNumber(twilioPhone),
            "Questionnaire \"" + q.getTitre() + "\": " + link
        ).create();
    }

    public static class DistributionRequest {
        private Long clientId;
        private String channel;

        public Long getClientId() { return clientId; }
        public void setClientId(Long clientId) { this.clientId = clientId; }
        public String getChannel() { return channel; }
        public void setChannel(String channel) { this.channel = channel; }
    }
}
