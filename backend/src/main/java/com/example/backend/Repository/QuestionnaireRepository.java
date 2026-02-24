package com.example.backend.Repository;
import com.example.backend.models.Questionnaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
@Repository

public interface QuestionnaireRepository extends JpaRepository<Questionnaire, Long> {
    
}
