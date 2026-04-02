package com.example.backend.models;

import jakarta.persistence.*;

@Entity
@Table(name = "permission")
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "description" , unique = true)
    private String description;

    public Long getId() {
         return id; }
    public void setId(Long id){
         this.id = id; }
    public String getDescription() {
         return description; }
    public void setDescription(String description) {
         this.description = description; }
}
