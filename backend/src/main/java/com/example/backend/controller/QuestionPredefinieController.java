package com.example.backend.controller;



import com.example.backend.models.QuestionPredefinie;
import com.example.backend.models.RoleQuestionnaire;
import com.example.backend.Repository.QuestionPredefinieRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/questions-predefinies")
@CrossOrigin(origins = "http://localhost:4200")
public class QuestionPredefinieController {

    private final QuestionPredefinieRepository repo;

    public QuestionPredefinieController(
            QuestionPredefinieRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<QuestionPredefinie> getByRole(
            @RequestParam RoleQuestionnaire role) {
        return repo.findByRoleQuestionnaire(role);
    }
}
