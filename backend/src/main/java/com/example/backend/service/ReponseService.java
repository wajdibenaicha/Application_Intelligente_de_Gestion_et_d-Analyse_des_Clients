package com.example.backend.service;

import com.example.backend.Repository.ReponseRepository;
import com.example.backend.models.Reponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;


@Service
public class ReponseService {
    @Autowired
    private ReponseRepository reponseRepository;

    public List<Reponse> getAllReponses() {
        return reponseRepository.findAll();
    }

    public Reponse getReponseById(long id) {
        return reponseRepository.findById(id).orElse(null);
    }

    public Reponse addReponse(Reponse reponse) {
        return reponseRepository.save(reponse);
    }

    public Reponse updateReponse(long id, Reponse reponse) {
        Reponse existing = getReponseById(id);
        if (existing != null) {
            reponse.setId(id);
            return reponseRepository.save(reponse);
        }
        return null;
    }

    public Reponse deleteReponse(long id) {
        Reponse existing = getReponseById(id);
        if (existing != null) {
            reponseRepository.delete(existing);
            return existing;
        }
        return null;
    }
}
