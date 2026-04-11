package com.example.backend.Repository;

import com.example.backend.models.ClientKpi;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ClientKpiRepository extends JpaRepository<ClientKpi, Long> {
    List<ClientKpi> findByClientId(Long clientId);
    Optional<ClientKpi> findByClientIdAndQuestionnaireId(
        Long clientId, Long questionnaireId);
}
