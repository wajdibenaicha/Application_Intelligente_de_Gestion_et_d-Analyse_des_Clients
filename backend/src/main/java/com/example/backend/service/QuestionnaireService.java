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
    public Questionnaire ADDQuestionnaire(Questionnaire quest){
        return questionnaireRepository.save(quest);
    }
    public Questionnaire updateQuestionnaire(long id , Questionnaire quest){
        Questionnaire exist = getQuestionnaireById(id);
        if(exist != null){
            quest.setId(id);
            return questionnaireRepository.save(quest);
        }
        return null;
     }
     public Questionnaire deleteQuestionnaire(long id){
         Questionnaire exist= getQuestionnaireById(id);
        if(exist!= null){
            questionnaireRepository.delete(exist);
            return exist;
        }
        else{
            return null ;
        }
     }
    
}
