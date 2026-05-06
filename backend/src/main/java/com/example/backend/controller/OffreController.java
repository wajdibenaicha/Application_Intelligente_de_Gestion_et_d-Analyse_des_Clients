package com.example.backend.controller;

import com.example.backend.Repository.ClientRepository;
import com.example.backend.models.Client;
import com.example.backend.models.Offre;
import com.example.backend.service.OffreService;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.regex.*;
import java.util.StringBuffer;

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
                    MimeMessage msg = mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
                    helper.setTo(client.getMail());
                    helper.setSubject(sujet);
                    String clientName = client.getFullName() != null ? client.getFullName() : "";
                    String descHtml = renderDescription(corps);
                    String html = emailHtml(clientName,
                        "<div style='border-left:4px solid #bbd003;padding:16px 20px;margin:0 0 16px;" +
                        "background:rgba(0,0,0,0.15);border-radius:0 8px 8px 0;'>" +
                        "<p style='margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;" +
                        "text-transform:uppercase;color:#bbd003;'>Offre spéciale</p>" +
                        "<h2 style='margin:0 0 14px;font-size:20px;color:#ffffff;'>" + offre.getTitle() + "</h2>" +
                        descHtml + "</div>"
                    );
                    helper.setText(html, true);
                    mailSender.send(msg);
                }
                sent++;
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(Map.of("message", "Offre envoyée à " + sent + " client(s).", "sent", sent));
    }

    private static String renderDescription(String description) {
        if (description == null || description.isBlank()) return "";
        String urlRegex = "(https?://[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=%]+)";
        Pattern p = Pattern.compile(urlRegex);
        Matcher m = p.matcher(description);
        StringBuffer sb = new StringBuffer();
        String buttonPart = "";
        while (m.find()) {
            String url = m.group(1);
            m.appendReplacement(sb, "");
            buttonPart += "<div style='margin-top:20px;text-align:center;'>" +
                "<a href='" + url + "' target='_blank' " +
                "style='display:inline-block;background:#bbd003;color:#1a3d2b;padding:12px 32px;" +
                "border-radius:25px;font-weight:700;font-size:15px;text-decoration:none;" +
                "letter-spacing:0.5px;'>Visiter ce site</a></div>";
        }
        m.appendTail(sb);
        String textPart = sb.toString().trim();
        String result = "";
        if (!textPart.isBlank())
            result += "<p style='margin:0;font-size:15px;line-height:1.7;color:#e8f5ee;white-space:pre-line;'>" + textPart + "</p>";
        result += buttonPart;
        return result;
    }

    private static String emailHtml(String clientName, String content) {
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
            "<p style='margin:0;font-size:16px;color:#e8f5ee;line-height:1.6;'>Bonjour <strong style='color:#ffffff;'>" + clientName + "</strong>,</p>" +
            "</td></tr>" +
            "<tr><td>" + content + "</td></tr>" +
            "<tr><td style='padding-top:36px;border-top:1px solid rgba(255,255,255,0.2);margin-top:36px;'>" +
            "<p style='margin:0;font-size:13px;color:#a5d6a7;line-height:1.6;'>Cordialement,<br/>" +
            "<strong style='color:#ffffff;'>STAR Assurances</strong></p>" +
            "</td></tr>" +
            "</table></td></tr></table></body></html>";
    }
}
