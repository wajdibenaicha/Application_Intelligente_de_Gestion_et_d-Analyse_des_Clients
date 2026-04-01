package com.example.backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.backend.Repository.QuestionnaireRepository;
import com.example.backend.models.Questionnaire;

@Service
public class QuestionnaireService {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private QuestionnaireRepository questionnaireRepository;

    public List<Questionnaire> getAll() {
        return questionnaireRepository.findAll();
    }

    public List<Questionnaire> getByGestionnaireId(Long gestionnaireId) {
        return questionnaireRepository.findByGestionnaireIdOrGestionnaireIsNull(gestionnaireId);
    }

    public Questionnaire save(Questionnaire q) {
        Questionnaire saved = questionnaireRepository.save(q);
        messagingTemplate.convertAndSend("/topic/questionnaires", getAll());
        return saved;
    }

    public Optional<Questionnaire> findById(Long id) {
        return questionnaireRepository.findById(id);
    }

    public Questionnaire getQuestionnaireById(Long id) {
        return questionnaireRepository.findById(id).orElse(null);
    }

    public void delete(Long id) {
        Questionnaire q = getQuestionnaireById(id);
        if (q != null) {
            q.getQuestions().clear();
            questionnaireRepository.save(q);
            questionnaireRepository.deleteById(id);
        }
    }

    public Questionnaire confirmQuestionnaire(Long id) {
        Questionnaire q = getQuestionnaireById(id);
        if (q != null) {
            q.setConfirmed(true);
            Questionnaire updated = questionnaireRepository.save(q);
            messagingTemplate.convertAndSend("/topic/questionnaires", getAll());
            return updated;
        }
        return null;
    }

    public Questionnaire rejeterQuestionnaire(Long id) {
        Questionnaire q = getQuestionnaireById(id);
        if (q != null) {
            q.setConfirmed(false);
            Questionnaire updated = questionnaireRepository.save(q);
            messagingTemplate.convertAndSend("/topic/questionnaires", getAll());
            return updated;
        }
        return null;
    }
}