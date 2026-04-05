package com.example.backend.service;

import com.example.backend.Repository.ClientRepository;
import com.example.backend.Repository.EnvoiQuestionnaireRepository;
import com.example.backend.Repository.QuestionRepository;
import com.example.backend.Repository.QuestionnaireRepository;
import com.example.backend.Repository.ReponseRepository;
import com.example.backend.models.Client;
import com.example.backend.models.EnvoiQuestionnaire;
import com.example.backend.models.Question;
import com.example.backend.models.Questionnaire;
import com.example.backend.models.Reponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class EnvoiService {
    @Autowired
    private EnvoiQuestionnaireRepository envoiRepository;
    @Autowired
    private ClientRepository clientRepository;
    @Autowired
    private QuestionRepository questionRepository;
    @Autowired
    private QuestionnaireRepository questionnaireRepository;
    @Autowired
    private ReponseRepository reponseRepository;

    public String genererLienChiffre(Long questionnaireId, Long clientId) {
        String token = UUID.randomUUID().toString();
        EnvoiQuestionnaire envoi = new EnvoiQuestionnaire();
        envoi.setQuestionnaireId(questionnaireId);
        envoi.setClientId(clientId);
        envoi.setToken(token);
        envoi.setRepondu(false);
        envoiRepository.save(envoi);
        return token;
    }

    public Long dechiffrerToken(String token) {
        EnvoiQuestionnaire envoi = envoiRepository.findByToken(token).orElse(null);
        if (envoi == null || envoi.isRepondu()) {
            return null;
        }
        return envoi.getQuestionnaireId();
    }

    public List<Client> filtrerClients(String typeContrat, Integer anneeMin, String profession) {
        List<Client> all = clientRepository.findAll();
        return all.stream().filter(c -> {
            if (typeContrat != null && !typeContrat.isEmpty() && !typeContrat.equals(c.getTypeContrat()))
                return false;
            if (anneeMin != null && c.getAnneeInscription() < anneeMin)
                return false;
            if (profession != null && !profession.isEmpty() && !profession.equals(c.getProfession()))
                return false;
            return true;
        }).toList();
    }

    @Transactional
    public boolean traiterReponse(String token, List<Map<String, Object>> reponses) {
        EnvoiQuestionnaire envoi = envoiRepository.findByToken(token).orElse(null);
        if (envoi == null || envoi.isRepondu()) {
            return false;
        }
        Long questionnaireId = envoi.getQuestionnaireId();
        Long clientId = envoi.getClientId();
        Client client = clientRepository.findById(clientId).orElse(null);
        Questionnaire questionnaire = questionnaireRepository.findById(questionnaireId).orElse(null);
        if (client == null || questionnaire == null) {
            return false;
        }
        for (Map<String, Object> item : reponses) {
            Object qidObj = item.get("questionId");
            if (qidObj == null)
                continue;
            Long questionId = Long.valueOf(qidObj.toString());
            String reponseTexte = (String) item.get("reponse");
            Question question = questionRepository.findById(questionId).orElse(null);
            if (question != null) {
                Reponse reponse = new Reponse();
                reponse.setClient(client);
                reponse.setQuestion(question);
                reponse.setQuestionnaire(questionnaire);
                reponse.setReponse(reponseTexte);
                reponseRepository.save(reponse);
            }
        }
        envoi.setRepondu(true);
        envoiRepository.save(envoi);
        return true;
    }
}