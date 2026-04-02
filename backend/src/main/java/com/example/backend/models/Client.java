package com.example.backend.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "clients")
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "mail" , unique = true)
    private String mail;
    @Column(name = "tel" , unique = true)
    private String tel;
    @Column(name = "full_name")
    private String fullName;
    @Column(name="anne_inscription")
    private Integer anneeInscription;
    @Column(name="type_contrat")
    private String typeContrat;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMail() {
        return mail;
    }

    public void setMail(String mail) {
        this.mail = mail;
    }

    public String getTel() {
        return tel;
    }

    public void setTel(String tel) {
        this.tel = tel;
    }
    public String getFullName() {
        return fullName;
    }
    public void setFullName(String fullName) {
        this.fullName = fullName;
    }
    public Integer getAnneeInscription() {
        return anneeInscription;
    }
    public void setAnneeInscription(Integer anneeInscription) {
        this.anneeInscription = anneeInscription;
    }
    public String getTypeContrat() {
        return typeContrat;
    }
    public void setTypeContrat(String typeContrat) {
        this.typeContrat = typeContrat;
    }
    
}