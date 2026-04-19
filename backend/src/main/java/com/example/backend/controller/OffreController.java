package com.example.backend.controller;

import com.example.backend.Repository.ClientRepository;
import com.example.backend.models.Client;
import com.example.backend.models.Offre;
import com.example.backend.service.OffreService;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/offres")
@CrossOrigin(origins = { "http://localhost:4200", "http://localhost:4201" })
public class OffreController {

    @Autowired private OffreService offreService;
    @Autowired private ClientRepository clientRepository;
    @Autowired private JavaMailSender mailSender;

    @Value("${twilio.phone-number:}")
    private String twilioPhone;

    @GetMapping
    public List<Offre> getAll() {
        return offreService.getAllOffres();
    }

    @PostMapping
    public ResponseEntity<Offre> create(@RequestBody Map<String, Object> body) {
        if (body.get("title") == null || body.get("description") == null) {
            return ResponseEntity.badRequest().build();
        }
        Offre offre = new Offre();
        offre.setTitle(body.get("title").toString());
        offre.setDescription(body.get("description").toString());
        offre.setCategorie(body.get("categorie") != null ? body.get("categorie").toString() : "GENERAL");
        offre.setScoreMin(body.get("scoreMin") != null ? Integer.valueOf(body.get("scoreMin").toString()) : 0);
        offre.setScoreMax(body.get("scoreMax") != null ? Integer.valueOf(body.get("scoreMax").toString()) : 100);
        offre.setActive(body.get("active") == null || Boolean.parseBoolean(body.get("active").toString()));
        return ResponseEntity.ok(offreService.addOffre(offre));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Offre> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Offre existing = offreService.getOffreById(id);
        if (existing == null) return ResponseEntity.notFound().build();
        if (body.get("title") != null) existing.setTitle(body.get("title").toString());
        if (body.get("description") != null) existing.setDescription(body.get("description").toString());
        if (body.get("categorie") != null) existing.setCategorie(body.get("categorie").toString());
        if (body.get("scoreMin") != null) existing.setScoreMin(Integer.valueOf(body.get("scoreMin").toString()));
        if (body.get("scoreMax") != null) existing.setScoreMax(Integer.valueOf(body.get("scoreMax").toString()));
        if (body.get("active") != null) existing.setActive(Boolean.parseBoolean(body.get("active").toString()));
        return ResponseEntity.ok(offreService.updateOffre(id, existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        offreService.deleteOffre(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Send an offer by email or SMS to one or more clients.
     * Body: { offreId, clientIds, channel ("email"|"sms"), sujet, corps }
     * The corps may contain {NOM_CLIENT} which is replaced per client.
     */
    @PostMapping("/envoyer")
    public ResponseEntity<?> envoyerOffre(@RequestBody Map<String, Object> body) {
        Object offreIdObj  = body.get("offreId");
        Object clientIdsObj = body.get("clientIds");
        if (offreIdObj == null || clientIdsObj == null)
            return ResponseEntity.badRequest().body("offreId and clientIds are required");

        Long offreId = Long.valueOf(offreIdObj.toString());
        Offre offre  = offreService.getOffreById(offreId);
        if (offre == null) return ResponseEntity.notFound().build();

        String channel = body.getOrDefault("channel", "email").toString();
        String sujet   = body.getOrDefault("sujet",
            "STAR Assurances – Offre spéciale : " + offre.getTitle()).toString();
        String corpsTemplate = body.getOrDefault("corps",
            "Bonjour {NOM_CLIENT},\n\nNous avons une offre exclusive pour vous :\n\n" +
            offre.getTitle() + "\n" + offre.getDescription() +
            "\n\nCordialement,\nL'équipe STAR Assurances").toString();

        @SuppressWarnings("unchecked")
        List<Integer> ids = (List<Integer>) clientIdsObj;
        int sent = 0;

        for (Integer clientIdInt : ids) {
            Client client = clientRepository.findById(clientIdInt.longValue()).orElse(null);
            if (client == null) continue;
            String corps = corpsTemplate.replace("{NOM_CLIENT}",
                client.getFullName() != null ? client.getFullName() : "");
            try {
                if ("sms".equalsIgnoreCase(channel)) {
                    String tel = client.getTel() != null ? client.getTel().replaceAll("\\s+", "") : "";
                    if (tel.isBlank()) continue;
                    if (!tel.startsWith("+")) tel = "+216" + tel;
                    if (twilioPhone == null || twilioPhone.isBlank()) continue;
                    Message.creator(
                        new PhoneNumber(tel),
                        new PhoneNumber(twilioPhone.replaceAll("\\s+", "")),
                        corps
                    ).create();
                } else {
                    if (client.getMail() == null || client.getMail().isBlank()) continue;
                    SimpleMailMessage msg = new SimpleMailMessage();
                    msg.setTo(client.getMail());
                    msg.setSubject(sujet);
                    msg.setText(corps);
                    mailSender.send(msg);
                }
                sent++;
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(Map.of("message", "Offre envoyée à " + sent + " client(s).", "sent", sent));
    }
}
