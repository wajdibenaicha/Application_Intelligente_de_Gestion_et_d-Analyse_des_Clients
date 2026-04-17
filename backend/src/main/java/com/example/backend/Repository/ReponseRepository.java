package com.example.backend.Repository;

import com.example.backend.models.Reponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReponseRepository extends JpaRepository<Reponse, Long> {
    List<Reponse> findByQuestionnaireId(Long questionnaireId);
    List<Reponse> findByClientIdAndQuestionnaireId(
    Long clientId, Long questionnaireId);

    void deleteByQuestionnaireId(Long questionnaireId);
}