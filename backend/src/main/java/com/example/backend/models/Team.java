package com.example.backend.models;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.FetchType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Set;
import java.util.HashSet;


@Entity
@Table(name = "team")
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, unique = true)
    private String name;

    // One directeur per team; a directeur can manage multiple teams
    @ManyToOne
    @JoinColumn(name = "directeur_id", nullable = false)
    @JsonIgnoreProperties({ "team" })
    private Gestionnaire directeur;

    // A gestionnaire member belongs to exactly one team (enforced by FK on gestionnaire.team_id)
    @OneToMany(mappedBy = "team", fetch = FetchType.LAZY)
    @JsonIgnoreProperties({ "team" })
    private Set<Gestionnaire> members = new HashSet<>();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Gestionnaire getDirecteur() {
        return directeur;
    }

    public void setDirecteur(Gestionnaire directeur) {
        this.directeur = directeur;
    }

    public Set<Gestionnaire> getMembers() {
        return members;
    }

    public void setMembers(Set<Gestionnaire> members) {
        this.members = members;
    }
}
