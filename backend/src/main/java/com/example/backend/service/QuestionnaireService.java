package com.example.backend.service;
import com.example.backend.models.Questionnaire;
import com.example.backend.Repository.QuestionnaireRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class QuestionnaireService {
    @Autowired
    private QuestionnaireRepository questionnaireRepository ;
    public List<Questionnaire> getQuestionnaireRepository() {
        return questionnaireRepository.findAll();
    }
    public Questionnaire getQuestionnaireById(long id){
        return questionnaireRepository.findById(id).orElse(null);
    }
    
    
}
