package com.example.backend.models;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "questionnaire")
public class Questionnaire {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "titre")
    private String titre;

    @Column(name = "description")
    private String description;

    @ManyToOne
    @JoinColumn(name = "gestionnaire_id")
    @JsonIgnoreProperties({ "password" })
    private Gestionnaire gestionnaire;

    @ManyToMany(fetch = FetchType.EAGER, cascade = { CascadeType.PERSIST, CascadeType.MERGE })
    @JoinTable(name = "questionnaire_questions", joinColumns = @JoinColumn(name = "questionnaire_id"), inverseJoinColumns = @JoinColumn(name = "question_id"))
    private List<Question> questions = new ArrayList<>();

    @Column(nullable = false, columnDefinition = "boolean default false")
    private Boolean confirmed = false;

    @Column(columnDefinition = "VARCHAR(50) DEFAULT 'BROUILLON'")
    private String statut = "BROUILLON";

    private String lienGoogleForm;

    @Column(length = 500)
    private String raisonRejet;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitre() {
        return titre;
    }

    public void setTitre(String titre) {
        this.titre = titre;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Gestionnaire getGestionnaire() {
        return gestionnaire;
    }

    public void setGestionnaire(Gestionnaire gestionnaire) {
        this.gestionnaire = gestionnaire;
    }

    public List<Question> getQuestions() {
        return questions;
    }

    public void setQuestions(List<Question> questions) {
        this.questions = questions;
    }

    public Boolean getConfirmed() {
        return confirmed;
    }

    public void setConfirmed(Boolean confirmed) {
        this.confirmed = confirmed;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public String getLienGoogleForm() {
        return lienGoogleForm;
    }

    public void setLienGoogleForm(String lienGoogleForm) {
        this.lienGoogleForm = lienGoogleForm;
    }

    public String getRaisonRejet() {
        return raisonRejet;
    }

    public void setRaisonRejet(String raisonRejet) {
        this.raisonRejet = raisonRejet;
    }
}