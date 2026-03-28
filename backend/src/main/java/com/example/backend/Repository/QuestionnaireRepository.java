package com.example.backend.Repository;

import com.example.backend.models.Questionnaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface QuestionnaireRepository extends JpaRepository<Questionnaire, Long> {

    List<Questionnaire> findByGestionnaireId(Long gestionnaireId);

    List<Questionnaire> findByGestionnaireIdOrGestionnaireIsNull(Long gestionnaireId);
}