package com.example.backend.models;

import jakarta.persistence.Column;
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
    private Long id;
    @ManyToOne
    @JoinColumn(name = "idRole")
    private Role role;
<<<<<<< HEAD
    private String full_name;
    private String password;
    @Column(name = "email")
    private String email;

    public Gestionnaire() {
=======
    private String email ;
    private String password ;
    public Gestionnaire (){
>>>>>>> 93cfe3b8d5b899c9183aa8b5d20abae756475c56

    }

    public Long getId() {
        return id;
    }

    public Role getRole() {
        return role;
    }
<<<<<<< HEAD

    public String getFull_name() {
        return full_name;
=======
    public String getEmail(){
        return email;
>>>>>>> 93cfe3b8d5b899c9183aa8b5d20abae756475c56
    }

    public String getPassword() {
        return password;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setRole(Role role) {
        this.role = role;
    }
<<<<<<< HEAD

    public void setFull_name(String full_name) {
        this.full_name = full_name;
=======
    public void setEmail(String email){
        this.email=email;
>>>>>>> 93cfe3b8d5b899c9183aa8b5d20abae756475c56
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

}
