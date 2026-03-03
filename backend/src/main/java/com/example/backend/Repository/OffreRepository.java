package com.example.backend.Repository;

import com.example.backend.models.Offre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface OffreRepository extends JpaRepository<Offre, Long> {
    
}
