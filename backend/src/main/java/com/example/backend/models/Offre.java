package com.example.backend.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "offre", uniqueConstraints = @UniqueConstraint(columnNames = { "title", "description" }))
public class Offre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "title")
    private String title;
    @Column(name = "description")
    private String description;
    @Column(nullable = false, columnDefinition = "varchar(255) NOT NULL DEFAULT 'general'")
    private String categorie = "general";

    @Column(nullable = false)
    private Integer scoreMin = 0;

    @Column(nullable = false)
    private Integer scoreMax = 100;


    @Column(nullable = false)
    private Boolean active = true;


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
    public String getCategorie() {
        return categorie;
    }
    public void setCategorie(String categorie) {
        this.categorie = categorie;
    }
    public Integer getScoreMin() {
        return scoreMin;
    }
    public void setScoreMin(Integer scoreMin) {
        this.scoreMin = scoreMin;
    }
    public Integer getScoreMax() {
        return scoreMax;
    }
    public void setScoreMax(Integer scoreMax) {
        this.scoreMax = scoreMax;
    }
    public Boolean getActive() {
        return active;
    }
    public void setActive(Boolean active) {
        this.active = active;
    }


}
