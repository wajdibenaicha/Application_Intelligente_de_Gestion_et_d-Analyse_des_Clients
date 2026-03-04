package com.example.backend.models;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import jakarta.persistence.Column;
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
    @Column(columnDefinition = "VARCHAR(1000)")
    private String options;
    
    public Question(){

    }
    public Question(Long id , String titre , String type){
        this.id=id;
        this.titre=titre;
        this.type=type;
        this.options = "";
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
    public String getOptions(){
        return options ;
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
    public void addOption(String option) {
    if (this.options == null || this.options.isEmpty()) this.options = option;
    else this.options = this.options + "," + option;
}

public void removeOption(String option) {
    List<String> list = new ArrayList<>(Arrays.asList(this.options.split(",")));
    list.remove(option);
    this.options = String.join(",", list);
}
}
