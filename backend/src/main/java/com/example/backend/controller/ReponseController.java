package com.example.backend.controller;

import com.example.backend.Repository.ReponseRepository;
import com.example.backend.models.Reponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/reponses")
@CrossOrigin(origins = "http://localhost:4200")
public class ReponseController {

    @Autowired
    private ReponseRepository reponseRepository;

    @GetMapping("/questionnaire/{id}")
    public List<Reponse> getByQuestionnaire(@PathVariable Long id) {
        return reponseRepository.findByQuestionnaireId(id);
    }

    @PostMapping
    public Reponse create(@RequestBody Reponse reponse) {
        return reponseRepository.save(reponse);
    }
}