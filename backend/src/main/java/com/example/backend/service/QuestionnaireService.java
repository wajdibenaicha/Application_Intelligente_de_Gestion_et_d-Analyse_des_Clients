package com.example.backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.Repository.QuestionnaireRepository;
import com.example.backend.Repository.ReponseRepository;
import com.example.backend.Repository.EnvoiQuestionnaireRepository;
import com.example.backend.Repository.ClientKpiRepository;
import com.example.backend.Repository.OffreRecommendationRepository;
import com.example.backend.models.ClientKpi;
import com.example.backend.models.Questionnaire;

@Service
public class QuestionnaireService {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private QuestionnaireRepository questionnaireRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ReponseRepository reponseRepository;

    @Autowired
    private EnvoiQuestionnaireRepository envoiRepository;

    @Autowired
    private ClientKpiRepository clientKpiRepository;

    @Autowired
    private OffreRecommendationRepository offreRecommendationRepository;

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

    @Transactional
    public void delete(Long id) {
        Questionnaire q = getQuestionnaireById(id);
        if (q != null) {
            // 1. Delete offre_recommendation → depends on client_kpi
            List<ClientKpi> kpis = clientKpiRepository.findByQuestionnaireId(id);
            for (ClientKpi kpi : kpis) {
                offreRecommendationRepository.findByClientKpiId(kpi.getId())
                    .ifPresent(offreRecommendationRepository::delete);
            }
            // 2. Delete client_kpi → depends on questionnaire
            clientKpiRepository.deleteAll(kpis);
            // 3. Delete reponses → depends on questionnaire
            reponseRepository.deleteByQuestionnaireId(id);
            // 4. Delete envois → depends on questionnaire
            envoiRepository.deleteByQuestionnaireId(id);
            // 5. Delete notifications linked to this questionnaire
            notificationService.deleteBySource(id, "QUESTIONNAIRE");
            // 6. Clear questions join table, then delete questionnaire
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
        // Directeur's questionnaires cannot be rejected
        boolean isDirecteur = q != null && q.getGestionnaire() != null
                && q.getGestionnaire().getRole() != null
                && "DIRECTEUR".equalsIgnoreCase(q.getGestionnaire().getRole().getName());
        if (q != null && !isDirecteur && ("EN_ATTENTE".equals(q.getStatut()) || "PUBLIE".equals(q.getStatut()))) {
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
        if (q != null && ("BROUILLON".equals(q.getStatut()) || "REJETE".equals(q.getStatut()))) {
            q.setStatut("EN_ATTENTE");
            q.setRaisonRejet(null);
            Questionnaire saved = questionnaireRepository.save(q);
            String gestName = (q.getGestionnaire() != null && q.getGestionnaire().getFullName() != null)
                    ? q.getGestionnaire().getFullName()
                    : "Un gestionnaire";
            notificationService.createNotification("DEMANDE_PUBLICATION",
                    gestName + " demande la publication du questionnaire : " + q.getTitre(),
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