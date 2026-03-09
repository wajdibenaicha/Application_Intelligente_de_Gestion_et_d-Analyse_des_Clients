package com.example.backend.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.models.Gestionnaire;


@Repository
public interface GestionnaireRepository extends JpaRepository<Gestionnaire, Long> {
    Gestionnaire findByEmailAndPassword(String email, String password);

}
