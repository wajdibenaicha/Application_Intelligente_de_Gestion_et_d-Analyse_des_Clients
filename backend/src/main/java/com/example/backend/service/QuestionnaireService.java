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

    @Autowired
    private NotificationService notificationService;

    public List<Questionnaire> getAll() {
        return questionnaireRepository.findAll();
    }

    public List<Questionnaire> getByGestionnaireId(Long gestionnaireId) {
        return questionnaireRepository.findByGestionnaireIdOrGestionnaireIsNull(gestionnaireId);
    }

    public Questionnaire save(Questionnaire q) {
        List<Long> newQuestionIds = q.getQuestions().stream()
                .map(question -> question.getId())
                .filter(id -> id != null)
                .sorted()
                .toList();
        if (!newQuestionIds.isEmpty()) {
            for (Questionnaire existing : questionnaireRepository.findAll()) {
                if (existing.getId() != null && existing.getId().equals(q.getId())) {
                    continue;
                }
                List<Long> existingIds = existing.getQuestions().stream()
                        .map(question -> question.getId())
                        .filter(id -> id != null)
                        .sorted()
                        .toList();
                if (existingIds.equals(newQuestionIds)) {
                    throw new RuntimeException("Un questionnaire avec les mêmes questions existe déjà");
                }
            }
        }

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
            messagingTemplate.convertAndSend("/topic/questionnaires", getAll());
        }
    }

    public Questionnaire confirmQuestionnaire(Long id) {
        Questionnaire q = getQuestionnaireById(id);
        if (q != null) {
            if ("EN_ATTENTE".equals(q.getStatut())) {
                q.setStatut("PUBLIE");
                q.setConfirmed(true);
            } else {
                q.setStatut("EN_ATTENTE");
                q.setConfirmed(false);
            }
            Questionnaire updated = questionnaireRepository.save(q);
            messagingTemplate.convertAndSend("/topic/questionnaires", getAll());
            return updated;
        }
        return null;
    }

    public Questionnaire rejeterQuestionnaire(Long id, String raison) {
        Questionnaire q = getQuestionnaireById(id);
        if (q != null && "EN_ATTENTE".equals(q.getStatut())) {
            q.setStatut("REJETE");
            q.setConfirmed(false);
            q.setRaisonRejet(raison);
            Questionnaire updated = questionnaireRepository.save(q);
            if (q.getGestionnaire() != null) {
                messagingTemplate.convertAndSendToUser(
                        q.getGestionnaire().getId().toString(),
                        "/topic/notifications",
                        "Votre questionnaire \"" + q.getTitre() + "\" a été rejeté. Motif : " + raison);
            }
            notificationService.deleteBySource(id, "QUESTIONNAIRE");
            messagingTemplate.convertAndSend("/topic/questionnaires", getAll());
            return updated;
        }
        return null;
    }

    public Questionnaire demanderPublication(Long id, Long gestionnaireId) {
        Questionnaire q = getQuestionnaireById(id);
        if (q != null && "BROUILLON".equals(q.getStatut())) {
            q.setStatut("EN_ATTENTE");
            Questionnaire saved = questionnaireRepository.save(q);
            notificationService.createNotification("DEMANDE_PUBLICATION",
                    "Le gestionnaire demande la publication du questionnaire : " + q.getTitre(),
                    id, "QUESTIONNAIRE");
            messagingTemplate.convertAndSend("/topic/questionnaires", getAll());
            return saved;
        }
        return null;
    }

    public Questionnaire retirerDemande(Long id) {
        Questionnaire q = getQuestionnaireById(id);
        if (q != null && "EN_ATTENTE".equals(q.getStatut())) {
            q.setStatut("BROUILLON");
            Questionnaire saved = questionnaireRepository.save(q);
            notificationService.deleteBySource(id, "QUESTIONNAIRE");
            messagingTemplate.convertAndSend("/topic/questionnaires", getAll());
            return saved;
        }
        return null;
    }

    public Questionnaire approuverPublication(Long id) {
        Questionnaire q = getQuestionnaireById(id);
        if (q != null && "EN_ATTENTE".equals(q.getStatut())) {
            q.setStatut("PUBLIE");
            q.setConfirmed(true);
            Questionnaire saved = questionnaireRepository.save(q);
            notificationService.deleteBySource(id, "QUESTIONNAIRE");
            if (q.getGestionnaire() != null) {
                messagingTemplate.convertAndSendToUser(
                        q.getGestionnaire().getId().toString(),
                        "/topic/notifications",
                        "Votre questionnaire " + q.getTitre() + " a été publié.");
            }
            messagingTemplate.convertAndSend("/topic/questionnaires", getAll());
            return saved;
        }
        return null;
    }
}