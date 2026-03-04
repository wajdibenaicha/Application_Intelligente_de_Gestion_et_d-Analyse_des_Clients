package com.example.backend.models;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;


@Entity
@Table(name = "offre")

public class Offre {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
     public Long id ;
     public String description ;
    public Offre(){

    }
    public Long getId(){
        return id ;
    }
    public String getDescription(){
        return description;
    }
    public void setId(Long id){
        this.id =id;
    }
    public void setDescription(String description){
        this.description=description;
    }
}
