package com.example.backend.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "segments_personnalises")
public class SegmentPersonnalise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private String color;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gestionnaire_id")
    private Gestionnaire gestionnaire;

    // ── Critères de filtrage ──────────────────────────────────────────────────
    private String typeContrat;
    private Integer anneeInscriptionMin;
    private Double primeMin;
    private Double primeMax;
    private String profession;
    private String situationFamiliale;
    private String adresseKeyword;   // mot-clé région (ex: "Tunis", "Sfax")
    private Integer kpiMin;
    private Integer kpiMax;

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // ── Getters / Setters ─────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Gestionnaire getGestionnaire() { return gestionnaire; }
    public void setGestionnaire(Gestionnaire gestionnaire) { this.gestionnaire = gestionnaire; }

    public String getTypeContrat() { return typeContrat; }
    public void setTypeContrat(String typeContrat) { this.typeContrat = typeContrat; }

    public Integer getAnneeInscriptionMin() { return anneeInscriptionMin; }
    public void setAnneeInscriptionMin(Integer anneeInscriptionMin) { this.anneeInscriptionMin = anneeInscriptionMin; }

    public Double getPrimeMin() { return primeMin; }
    public void setPrimeMin(Double primeMin) { this.primeMin = primeMin; }

    public Double getPrimeMax() { return primeMax; }
    public void setPrimeMax(Double primeMax) { this.primeMax = primeMax; }

    public String getProfession() { return profession; }
    public void setProfession(String profession) { this.profession = profession; }

    public String getSituationFamiliale() { return situationFamiliale; }
    public void setSituationFamiliale(String situationFamiliale) { this.situationFamiliale = situationFamiliale; }

    public String getAdresseKeyword() { return adresseKeyword; }
    public void setAdresseKeyword(String adresseKeyword) { this.adresseKeyword = adresseKeyword; }

    public Integer getKpiMin() { return kpiMin; }
    public void setKpiMin(Integer kpiMin) { this.kpiMin = kpiMin; }

    public Integer getKpiMax() { return kpiMax; }
    public void setKpiMax(Integer kpiMax) { this.kpiMax = kpiMax; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
