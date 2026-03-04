package com.example.backend.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.backend.Repository.ReponseRepository;
import com.example.backend.models.Reponse;


@Service
public class ReponseService {
    @Autowired
    private ReponseRepository reponseRepository;

    public List<Reponse> getAllReponses() {
        return reponseRepository.findAll();
    }

    public Reponse getReponseById(Long id) {
        return reponseRepository.findById(id).orElse(null);
    }

    public Reponse addReponse(Reponse reponse) {
        return reponseRepository.save(reponse);
    }

    public Reponse updateReponse(Long id, Reponse reponse) {
        Reponse existing = getReponseById(id);
        if (existing != null) {
            reponse.setId(id);
            return reponseRepository.save(reponse);
        }
        return null;
    }

    public Reponse deleteReponse(Long id) {
        Reponse existing = getReponseById(id);
        if (existing != null) {
            reponseRepository.delete(existing);
            return existing;
        }
        return null;
    }
}
