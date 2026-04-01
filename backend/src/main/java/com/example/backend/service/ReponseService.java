package com.example.backend.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.backend.Repository.ReponseRepository;
import com.example.backend.models.Reponse;

@Service
public class ReponseService {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ReponseRepository reponseRepository;

    public List<Reponse> getAllReponses() {
        return reponseRepository.findAll();
    }

    public List<Reponse> getReponsesByQuestionnaire(Long questionnaireId) {
        return reponseRepository.findByQuestionnaireId(questionnaireId);
    }

    public Reponse getReponseById(Long id) {
        return reponseRepository.findById(id).orElse(null);
    }

    public Reponse addReponse(Reponse reponse) {
        Reponse saved = reponseRepository.save(reponse);
        messagingTemplate.convertAndSend("/topic/reponses", getAllReponses());
        return saved;
    }

    public Reponse updateReponse(Long id, Reponse reponse) {
        Reponse existing = getReponseById(id);
        if (existing != null) {
            reponse.setId(id);
            Reponse updated = reponseRepository.save(reponse);
            messagingTemplate.convertAndSend("/topic/reponses", getAllReponses());
            return updated;
        }
        return null;
    }

    public Reponse deleteReponse(Long id) {
        Reponse existing = getReponseById(id);
        if (existing != null) {
            reponseRepository.delete(existing);
            messagingTemplate.convertAndSend("/topic/reponses", getAllReponses());
            return existing;
        }
        return null;
    }
}