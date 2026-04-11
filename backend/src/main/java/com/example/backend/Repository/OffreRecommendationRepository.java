package com.example.backend.Repository;

import com.example.backend.models.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface OffreRecommendationRepository
    extends JpaRepository<OffreRecommendation, Long> {
    List<OffreRecommendation> findByStatus(RecommendationStatus status);
    Optional<OffreRecommendation> findByClientKpiId(Long clientKpiId);
}
