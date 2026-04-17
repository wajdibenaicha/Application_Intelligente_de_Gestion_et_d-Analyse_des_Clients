package com.example.backend.Repository;

import com.example.backend.models.QuestionPredefinie;
import com.example.backend.models.RoleQuestionnaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository

public interface QuestionPredefinieRepository
    extends JpaRepository<QuestionPredefinie, Long> {

    List<QuestionPredefinie> findByRoleQuestionnaire(RoleQuestionnaire role);
}
