package com.example.backend.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "offre")
public class Offre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String description;
    private String statut = "EN_ATTENTE";

    @Column(name = "recommandation_ia", columnDefinition = "TEXT")
    private String recommandationIA;

    @Column(name = "offre_manuelle", columnDefinition = "TEXT")
    private String offreManuelle;

    @ManyToOne
    @JoinColumn(name = "client_id")
    @JsonIgnoreProperties({ "reponses" })
    private Client client;

    @ManyToOne
    @JoinColumn(name = "questionnaire_id")
    @JsonIgnoreProperties({ "questions", "gestionnaire" })
    private Questionnaire questionnaire;

    @Column(name = "date_creation")
    private LocalDateTime dateCreation = LocalDateTime.now();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public String getRecommandationIA() {
        return recommandationIA;
    }

    public void setRecommandationIA(String recommandationIA) {
        this.recommandationIA = recommandationIA;
    }

    public String getOffreManuelle() {
        return offreManuelle;
    }

    public void setOffreManuelle(String offreManuelle) {
        this.offreManuelle = offreManuelle;
    }

    public Client getClient() {
        return client;
    }

    public void setClient(Client client) {
        this.client = client;
    }

    public Questionnaire getQuestionnaire() {
        return questionnaire;
    }

    public void setQuestionnaire(Questionnaire questionnaire) {
        this.questionnaire = questionnaire;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }
}