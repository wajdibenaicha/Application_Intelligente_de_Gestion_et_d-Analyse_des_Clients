package com.example.backend.Repository;
import com.example.backend.models.Administrateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository

public interface AdministrateurRepository extends JpaRepository<Administrateur, Long> {
    
}
