package com.example.backend.models;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "administrateur")

public class Administrateur {
    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id ;
    private String email ;
    private String password ;
    public Administrateur(){

    }
    public Administrateur( Long id , String email , String password){
        this.id=id;
        this.email=email;
        this.password=password;
    }

    public Long getId(){
        return id;
    }
    public String getEmail(){
        return email;
    }
    public String getPassword(){
        return password;
    } 
     public void setId(Long id){
        this.id=id ;
    }
     public void setPassword(String  password){
        this.password=password ;
    }
     public void setEmail(String email){
        this.email=email ;
    }

}
