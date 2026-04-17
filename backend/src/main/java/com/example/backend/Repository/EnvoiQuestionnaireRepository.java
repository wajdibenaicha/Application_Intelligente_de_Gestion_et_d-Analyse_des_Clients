package com.example.backend.Repository;

import com.example.backend.models.EnvoiQuestionnaire;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EnvoiQuestionnaireRepository extends JpaRepository<EnvoiQuestionnaire, Long> {
    Optional<EnvoiQuestionnaire> findByToken(String token);
    Optional<EnvoiQuestionnaire> findFirstByTokenAndReponduFalse(String token);
    Optional<EnvoiQuestionnaire> findFirstByQuestionnaireIdAndClientIdAndReponduFalse(Long questionnaireId, Long clientId);
    java.util.List<EnvoiQuestionnaire> findByQuestionnaireId(Long questionnaireId);
    boolean existsByQuestionnaireIdAndReponduFalse(Long questionnaireId);
    void deleteByQuestionnaireId(Long questionnaireId);
}