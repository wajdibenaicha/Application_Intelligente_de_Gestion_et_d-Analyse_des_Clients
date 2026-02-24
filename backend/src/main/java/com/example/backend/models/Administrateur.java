package com.example.backend.models;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "administrateur")

public class Administrateur {
    @Id 
    private long id ;
    private String full_name ;
    private String password ;
    public Administrateur(){

    }
    public Administrateur( long id , String full_name , String password){
        this.id=id;
        this.full_name=full_name;
        this.password=password;
    }

    public long getId(){
        return id;
    }
    public String getFull_name(){
        return full_name;
    }
    public String getPassword(){
        return password;
    } 
     public void setId(long id){
        this.id=id ;
    }
     public void setPassword(String  password){
        this.password=password ;
    }
     public void setFull_name(String full_name){
        this.full_name=full_name ;
    }

}
