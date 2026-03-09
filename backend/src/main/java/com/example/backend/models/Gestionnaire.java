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
    private Long id ;
    @ManyToOne
    @JoinColumn(name = "idRole")
    private Role role;
    private String email ;
    private String password ;
    public Gestionnaire (){

    }
    public Long getId(){
        return id ;
    }
    public Role getRole(){
        return role ;
    }
    public String getEmail(){
        return email;
    }

    public String getPassword(){
        return password;
    }
    public void setId (Long id){
        this.id=id;
    }
    public void setRole(Role role){
        this.role=role;
    }
    public void setEmail(String email){
        this.email=email;
    }
    public void setPassword(String password){
        this.password=password;
    }

}
