package com.example.backend.models;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "permission")
public class Permission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public long id ;
    public String description ;
    public Permission(){

    }
    public long getId(){
        return id ;
    }
    public String getDescription(){
        return description ; 
    }
    public void setId(long id){
        this.id=id;
    }
    public void setDescription(String description){
        this.description=description;
    }
}
