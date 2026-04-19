package com.example.backend.service;

import com.example.backend.models.*;
import com.example.backend.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.*;

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

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(clientEmail);
        msg.setSubject("STAR Assurances – Offre personnalisée : " + offre.getTitle());
        msg.setText(
            "Bonjour " + clientName + ",\n\n" +
            "Suite à votre questionnaire, nous avons sélectionné une offre adaptée à votre profil :\n\n" +
            "🎁 " + offre.getTitle() + "\n" + offre.getDescription() + "\n\n" +
            "N'hésitez pas à nous contacter pour en savoir plus.\n\nCordialement,\nL'équipe STAR Assurances"
        );
        mailSender.send(msg);

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
