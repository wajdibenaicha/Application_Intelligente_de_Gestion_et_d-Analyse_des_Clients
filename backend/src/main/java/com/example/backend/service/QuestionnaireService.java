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

    public Questionnaire confirmQuestionnaire(Long id) {
        Questionnaire exist = getQuestionnaireById(id);
        if (exist != null) {
            exist.setConfirmed(true);
            return questionnaireRepository.save(exist);
        }
        return null;
    }
}
