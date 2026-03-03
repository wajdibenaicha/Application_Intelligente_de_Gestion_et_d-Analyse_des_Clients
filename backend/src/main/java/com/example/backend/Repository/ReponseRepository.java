package com.example.backend.Repository;

import com.example.backend.models.Reponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

o
@Repository
public interface ReponseRepository extends JpaRepository<Reponse, Long> {
    
}
