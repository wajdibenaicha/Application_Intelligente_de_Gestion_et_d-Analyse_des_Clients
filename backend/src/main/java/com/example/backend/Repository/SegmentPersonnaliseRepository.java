package com.example.backend.Repository;

import com.example.backend.models.SegmentPersonnalise;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SegmentPersonnaliseRepository extends JpaRepository<SegmentPersonnalise, Long> {
    List<SegmentPersonnalise> findByGestionnaireIdOrderByCreatedAtDesc(Long gestionnaireId);
}
