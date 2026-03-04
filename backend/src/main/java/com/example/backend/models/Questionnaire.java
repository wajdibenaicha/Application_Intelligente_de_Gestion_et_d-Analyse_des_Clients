package com.example.backend.models;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "questionnaire")

public class Questionnaire {
    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id ;
    private String titre ;
     @ManyToMany
         @JoinTable(
        name = "questionnaire_questions",
        joinColumns = @JoinColumn(name = "questionnaire_id"),
        inverseJoinColumns = @JoinColumn(name = "question_id")
    )
    private  List<Question> questions = new ArrayList<>();
    public Questionnaire(){

    }
    public Long getId(){
        return id ;
    }
    public String getTitre(){
        return titre ;
    }
    public List<Question> getQuestions(){
        return questions ;
    }
    public void setId(Long id){
        this.id=id;
    }
    public void setTitre(String titre){
        this.titre=titre;
    }
    public void addQuestion(Question question){
        this.questions.add(question);
    }
     public void removeQuestion(Question question){
        this.questions.remove(question);
    }
}
