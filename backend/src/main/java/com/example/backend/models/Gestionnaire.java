package com.example.backend.models;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "gestionnaire")

public class Gestionnaire {
    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id ;
    @ManyToOne
    @JoinColumn(name = "idRole")
    private Role role;
    private String full_name;
    private String password ;
    public Gestionnaire (){

    }
    public long getId(){
        return id ;
    }
    public Role getRole(){
        return role ;
    }
    public String getFull_name(){
        return full_name;
    }

    public String getPassword(){
        return password;
    }
    public void setId (long id){
        this.id=id;
    }
    public void setRole(Role role){
        this.role=role;
    }
    public void setFull_name(String full_name){
        this.full_name=full_name;
    }
    public void setPassword(String password){
        this.password=password;
    }

}
