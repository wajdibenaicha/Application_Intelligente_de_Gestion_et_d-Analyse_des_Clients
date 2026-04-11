package com.example.backend.Repository;

import com.example.backend.models.Offre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OffreRepository extends JpaRepository<Offre, Long> {
    List<Offre> findByActiveAndScoreMinLessThanEqualAndScoreMaxGreaterThanEqual(
    Boolean active, Integer score1, Integer score2);

}