package com.example.backend.Repository;

import com.example.backend.models.Gestionnaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface GestionnaireRepository extends JpaRepository<Gestionnaire, Long> {
    
}
