package com.example.backend.service;

import com.example.backend.Repository.OffreRepository;
import com.example.backend.models.Offre;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;


@Service
public class OffreService {
    @Autowired
    private OffreRepository offreRepository;

    public List<Offre> getAllOffres() {
        return offreRepository.findAll();
    }

    public Offre getOffreById(Long id) {
        return offreRepository.findById(id).orElse(null);
    }

    public Offre addOffre(Offre offre) {
        return offreRepository.save(offre);
    }

    public Offre updateOffre(Long id, Offre offre) {
        Offre existing = getOffreById(id);
        if (existing != null) {
            offre.setId(id);
            return offreRepository.save(offre);
        }
        return null;
    }

    public Offre deleteOffre(Long id) {
        Offre existing = getOffreById(id);
        if (existing != null) {
            offreRepository.delete(existing);
            return existing;
        }
        return null;
    }
}
