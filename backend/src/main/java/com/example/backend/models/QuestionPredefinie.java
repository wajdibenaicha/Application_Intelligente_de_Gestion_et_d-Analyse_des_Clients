package com.example.backend.models;

import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Table;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Table(name = "question_predefinie")
@Entity
public class QuestionPredefinie {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titre;

    @Column(nullable = false)
    private String type;

    private String options; 

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoleQuestionnaire roleQuestionnaire;

    @Column(nullable = false)
    private String categorie;

    @Column(nullable = false)
    private int ordreRecommande;

    @Column(nullable = false)
    private boolean obligatoire = false;

    
    public long getId() {
        return id;
    }
    public void setId(long id) {
        this.id = id;
    }
    public String getTitre() {
        return titre;
    }
    public void setTitre(String titre) {
        this.titre = titre;
    }
    public String getType() {
        return type;
    }
    public void setType(String type) {
        this.type = type;
    }
    public String getOptions() {
        return options;
    }
    public void setOptions(String options) {
        this.options = options;
    }
    public RoleQuestionnaire getRoleQuestionnaire() {
        return roleQuestionnaire;
    }
    public void setRoleQuestionnaire(RoleQuestionnaire roleQuestionnaire) {
        this.roleQuestionnaire = roleQuestionnaire;
    }
    public String getCategorie() {
        return categorie;
    }
    public void setCategorie(String categorie) {
        this.categorie = categorie;
    }
    public int getOrdreRecommande() {
        return ordreRecommande;
    }
    public void setOrdreRecommande(int ordreRecommande) {
        this.ordreRecommande = ordreRecommande;
    }
    public boolean isObligatoire() {
        return obligatoire;
    }
    public void setObligatoire(boolean obligatoire) {
        this.obligatoire = obligatoire;
    }


}
