package com.example.backend.service;

import com.example.backend.models.*;
import com.example.backend.Repository.*;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.*;

@Service
public class OffreRecommendationService {

    @Autowired private OffreRepository offreRepository;
    @Autowired private OffreRecommendationRepository recommendationRepo;
    @Autowired private KpiCalculatorService kpiService;
    @Autowired private JavaMailSender mailSender;

    public OffreRecommendation generateRecommendation(
            Long clientId, Long questionnaireId) {

    
        ClientKpi kpi = kpiService.calculateGlobalKpi(clientId);
        if (kpi == null) kpi = kpiService.calculateKpi(clientId, questionnaireId);
        if (kpi == null) throw new RuntimeException("Aucune réponse trouvée");

    
        List<Offre> matching = offreRepository
            .findByActiveAndScoreMinLessThanEqualAndScoreMaxGreaterThanEqual(
                true, kpi.getScore().intValue(), kpi.getScore().intValue());
        Offre bestMatch = matching.isEmpty() ? null : matching.get(0);


        OffreRecommendation rec = new OffreRecommendation();
        rec.setClientKpi(kpi);
        rec.setAiRecommendedOffre(bestMatch);
        rec.setAiReason(buildReason(kpi, bestMatch));
        rec.setStatus(RecommendationStatus.PENDING);

        return recommendationRepo.save(rec);
    }

    public OffreRecommendation acceptRecommendation(Long id) {
        OffreRecommendation rec = recommendationRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Not found"));
        rec.setFinalOffre(rec.getAiRecommendedOffre());
        rec.setStatus(RecommendationStatus.ACCEPTED);
        return recommendationRepo.save(rec);
    }

    public OffreRecommendation overrideRecommendation(Long id, Long offreId) {
        OffreRecommendation rec = recommendationRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Not found"));
        Offre offre = offreRepository.findById(offreId)
            .orElseThrow(() -> new RuntimeException("Offre not found"));
        rec.setFinalOffre(offre);
        rec.setStatus(RecommendationStatus.OVERRIDDEN);
        return recommendationRepo.save(rec);
    }

    public OffreRecommendation sendRecommendation(Long id) {
        OffreRecommendation rec = recommendationRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Not found"));
        Offre offre = rec.getFinalOffre() != null ? rec.getFinalOffre() : rec.getAiRecommendedOffre();
        if (offre == null) throw new RuntimeException("Aucune offre sélectionnée pour cet envoi.");
        String clientEmail = rec.getClientKpi().getClient().getMail();
        String clientName  = rec.getClientKpi().getClient().getFullName();
        if (clientEmail == null || clientEmail.isBlank())
            throw new RuntimeException("Le client n'a pas d'adresse email.");

        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setTo(clientEmail);
            helper.setSubject("STAR Assurances – Offre personnalisée : " + offre.getTitle());
            String descHtml = renderDescription(offre.getDescription());
            String html = emailHtml(
                clientName,
                "<p style='margin:0 0 16px;font-size:15px;line-height:1.7;color:#e8f5ee;'>" +
                "Suite à votre questionnaire, nous avons sélectionné une offre adaptée à votre profil :</p>" +
                "<div style='border-left:4px solid #bbd003;padding:16px 20px;margin:0 0 24px;background:rgba(0,0,0,0.15);border-radius:0 8px 8px 0;'>" +
                "<p style='margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#bbd003;'>Offre personnalisée</p>" +
                "<h2 style='margin:0 0 12px;font-size:20px;font-weight:700;color:#ffffff;'>" + offre.getTitle() + "</h2>" +
                descHtml +
                "</div>" +
                "<p style='margin:0;font-size:14px;color:#c8e6c9;'>N'hésitez pas à nous contacter pour en savoir plus.</p>"
            );
            helper.setText(html, true);
            mailSender.send(msg);
        } catch (Exception e) {
            throw new RuntimeException("Erreur envoi email offre", e);
        }

        rec.setStatus(RecommendationStatus.SENT);
        rec.setSentAt(LocalDateTime.now());
        return recommendationRepo.save(rec);
    }

    public List<OffreRecommendation> findByStatus(RecommendationStatus s) {
        return recommendationRepo.findByStatus(s);
    }

    public List<OffreRecommendation> findAll() {
        return recommendationRepo.findAll();
    }

    private static String renderDescription(String description) {
        if (description == null || description.isBlank()) return "";
        String urlRegex = "(https?://[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=%]+)";
        Pattern p = Pattern.compile(urlRegex);
        Matcher m = p.matcher(description);
        StringBuffer sb = new StringBuffer();
        String textPart = description;
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
        textPart = sb.toString().trim();
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

    private String buildReason(ClientKpi kpi, Offre offre) {
        return String.format(
            "Client a obtenu %.1f/100 (sentiment: %s). " +
            "Offre recommandée : '%s' (catégorie: %s, range %d-%d).",
            kpi.getScore(), kpi.getSentiment(),
            offre != null ? offre.getTitle() : "Aucune",
            offre != null ? offre.getCategorie() : "N/A",
            offre != null ? offre.getScoreMin() : 0,
            offre != null ? offre.getScoreMax() : 0);
    }
}
