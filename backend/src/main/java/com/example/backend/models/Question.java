package com.example.backend.models;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "question")

public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id ; 
    public String titre;
    public String type ;
    public Question(){

    }
    public Long getId(){
        return id ;
    }
    public String getTitre(){
        return titre ;
    }
    public String getType(){
        return type ;
    }
    public void setId(Long id ){
        this.id=id;
    }
    public void setTitre(String titre){
        this.titre=titre;
    }
    public void setType(String type){
        this.type=type;
    }
}
