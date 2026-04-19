package com.example.backend.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.backend.Repository.OffreRecommendationRepository;
import com.example.backend.Repository.OffreRepository;
import com.example.backend.models.Offre;
import com.example.backend.models.OffreRecommendation;

@Service
public class OffreService {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private OffreRepository offreRepository;

    @Autowired
    private OffreRecommendationRepository recommendationRepository;

    public List<Offre> getAllOffres() {
        return offreRepository.findAll();
    }

    public Offre getOffreById(Long id) {
        return offreRepository.findById(id).orElse(null);
    }

    public Offre addOffre(Offre offre) {
        Offre saved = offreRepository.save(offre);
        messagingTemplate.convertAndSend("/topic/offres", getAllOffres());
        return saved;
    }

    public Offre updateOffre(Long id, Offre offre) {
        Offre existing = getOffreById(id);
        if (existing != null) {
            offre.setId(id);
            Offre updated = offreRepository.save(offre);
            messagingTemplate.convertAndSend("/topic/offres", getAllOffres());
            return updated;
        }
        return null;
    }

    public Offre deleteOffre(Long id) {
        Offre existing = getOffreById(id);
        if (existing != null) {
            for (OffreRecommendation r : recommendationRepository.findByAiRecommendedOffreId(id)) {
                r.setAiRecommendedOffre(null);
                recommendationRepository.save(r);
            }
            for (OffreRecommendation r : recommendationRepository.findByFinalOffreId(id)) {
                r.setFinalOffre(null);
                recommendationRepository.save(r);
            }
            offreRepository.delete(existing);
            messagingTemplate.convertAndSend("/topic/offres", getAllOffres());
            return existing;
        }
        return null;
    }
}
