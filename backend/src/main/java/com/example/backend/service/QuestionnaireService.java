package com.example.backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.backend.Repository.QuestionnaireRepository;
import com.example.backend.models.Questionnaire;

@Service
public class QuestionnaireService {

    @Autowired
    private QuestionnaireRepository questionnaireRepository;

    public List<Questionnaire> getAll() {
        return questionnaireRepository.findAll();
    }

    public List<Questionnaire> getByGestionnaireId(Long gestionnaireId) {
        return questionnaireRepository.findByGestionnaireIdOrGestionnaireIsNull(gestionnaireId);
    }

    public Questionnaire save(Questionnaire q) {
        return questionnaireRepository.save(q);
    }

    public Optional<Questionnaire> findById(Long id) {
        return questionnaireRepository.findById(id);
    }

    public Questionnaire getQuestionnaireById(Long id) {
        return questionnaireRepository.findById(id).orElse(null);
    }

    public void delete(Long id) {
        questionnaireRepository.deleteById(id);
    }

    public Questionnaire demanderPublication(Long id) {
        Questionnaire q = getQuestionnaireById(id);
        if (q != null) {
            q.setStatut("EN_ATTENTE");
            return questionnaireRepository.save(q);
        }
        return null;
    }

    public Questionnaire confirmQuestionnaire(Long id) {
        Questionnaire q = getQuestionnaireById(id);
        if (q != null) {
            q.setStatut("PUBLIE");
            return questionnaireRepository.save(q);
        }
        return null;
    }

    public Questionnaire rejeterQuestionnaire(Long id) {
        Questionnaire q = getQuestionnaireById(id);
        if (q != null) {
            q.setStatut("REJETE");
            return questionnaireRepository.save(q);
        }
        return null;
    }
}