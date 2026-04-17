package com.example.backend.Repository;


import org.springframework.stereotype.Repository;
import com.example.backend.models.Team;
import org.springframework.data.jpa.repository.JpaRepository;

@Repository

public interface  TeamRepository  extends JpaRepository<Team, Long> {
    
}
