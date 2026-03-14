package com.example.backend.service;

import com.example.backend.Repository.QuestionnaireRepository;
import com.example.backend.models.Questionnaire;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class QuestionnaireService {

    @Autowired
    private QuestionnaireRepository questionnaireRepository;

    public List<Questionnaire> getAll() {
        return questionnaireRepository.findAll();
    }

    public List<Questionnaire> getByGestionnaire(Long gestionnaireId) {
        return questionnaireRepository.findByGestionnaireId(gestionnaireId);
    }

    public Questionnaire save(Questionnaire q) {
        return questionnaireRepository.save(q);
    }

    public Optional<Questionnaire> findById(Long id) {
        return questionnaireRepository.findById(id);
    }

    public void delete(Long id) {
        questionnaireRepository.deleteById(id);
    }

    public Questionnaire demanderPublication(Long id) {
        return questionnaireRepository.findById(id).map(q -> {
            q.setStatut("EN_ATTENTE");
            return questionnaireRepository.save(q);
        }).orElseThrow();
    }
}