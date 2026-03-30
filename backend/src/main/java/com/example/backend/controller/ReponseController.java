package com.example.backend.controller;

import com.example.backend.models.Reponse;
import com.example.backend.service.ReponseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/reponses")
@CrossOrigin(origins = "http://localhost:4200")
public class ReponseController {

    @Autowired
    private ReponseService reponseService;

    @GetMapping
    public List<Reponse> getAll() {
        return reponseService.getAllReponses();
    }

    @GetMapping("/questionnaire/{id}")
    public List<Reponse> getByQuestionnaire(@PathVariable Long id) {
        return reponseService.getReponsesByQuestionnaire(id);
    }

    @PostMapping
    public Reponse create(@RequestBody Reponse reponse) {
        return reponseService.addReponse(reponse);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        reponseService.deleteReponse(id);
    }
}