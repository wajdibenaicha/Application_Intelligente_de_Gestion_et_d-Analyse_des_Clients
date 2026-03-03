package com.example.backend.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.models.Reponse;


@Repository
public interface ReponseRepository extends JpaRepository<Reponse, Long> {
    
}
