package com.example.backend.service;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.backend.Repository.QuestionRepository;
import com.example.backend.models.Question;


@Service


public class QuestionService {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private QuestionRepository questionRepository ;
    public List<Question> getAllQuestions(){
        return questionRepository.findAll();
    }
    public Question getQuestionById(Long id){
        return questionRepository.findById(id).orElse(null);
    }
    public Question addQuestion(Question question){
        Question saved = questionRepository.save(question);
        messagingTemplate.convertAndSend("/topic/questions", getAllQuestions());
        return saved;
    }
    public Question updateQuestion(Long id , Question question){
        Question exQ=getQuestionById(id);
        if(exQ!=null){
            question.setId(id);
            Question updated = questionRepository.save(question);
            messagingTemplate.convertAndSend("/topic/questions", getAllQuestions());
            return updated;
        }
        else{
            return null ;
        }
    }
    public Question deleteQuestion(Long id){
        Question exQ=getQuestionById(id);
        if(exQ!=null){
            questionRepository.delete(exQ);
            messagingTemplate.convertAndSend("/topic/questions", getAllQuestions());
            return exQ;
        }
        else{
            return null ;
        }
    }
}
