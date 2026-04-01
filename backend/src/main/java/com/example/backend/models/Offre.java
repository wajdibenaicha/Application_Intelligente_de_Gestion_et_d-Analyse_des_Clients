package com.example.backend.models;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "offre")
public class Offre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String description;

    @Column(columnDefinition = "VARCHAR(50) DEFAULT 'EN_ATTENTE'")
    private String statut = "EN_ATTENTE";

    @Column(columnDefinition = "TEXT")
    private String recommandationIA;

    @Column(columnDefinition = "TEXT")
    private String offreManuelle;

    private String dateCreation;

    @ManyToOne
    @JoinColumn(name = "client_id")
    @JsonIgnoreProperties({"offres"})
    private Client client;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }

    public String getRecommandationIA() { return recommandationIA; }
    public void setRecommandationIA(String recommandationIA) { this.recommandationIA = recommandationIA; }

    public String getOffreManuelle() { return offreManuelle; }
    public void setOffreManuelle(String offreManuelle) { this.offreManuelle = offreManuelle; }

    public String getDateCreation() { return dateCreation; }
    public void setDateCreation(String dateCreation) { this.dateCreation = dateCreation; }

    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
}
