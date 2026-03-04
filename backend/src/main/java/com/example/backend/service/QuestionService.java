package com.example.backend.service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.backend.Repository.QuestionRepository;
import com.example.backend.models.Question;
import java.util.List;


@Service


public class QuestionService {
    @Autowired
    private QuestionRepository questionRepository ;
    public List<Question> getAllQuestions(){
        return questionRepository.findAll();
    }
    public Question getQuestionById(Long id){
        return questionRepository.findById(id).orElse(null);
    }
    public Question addQuestion(Question question){
        return questionRepository.save(question);
    }
    public Question updateQuestion(Long id , Question question){
        Question exQ=getQuestionById(id);
        if(exQ!=null){
            question.setId(id);
            return questionRepository.save(question);
        }
        else{
            return null ;
        }
    }
    public Question deleteQuestion(Long id){
        Question exQ=getQuestionById(id);
        if(exQ!=null){
            questionRepository.delete(exQ);
            return exQ;
        }
        else{
            return null ;
        }
    }
}
