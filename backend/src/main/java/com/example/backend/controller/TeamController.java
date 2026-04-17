package com.example.backend.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.backend.service.TeamService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.http.ResponseEntity;
import java.util.List;
import java.util.Map;
import com.example.backend.models.Team;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;


@RestController
@RequestMapping("/api/teams")
@CrossOrigin(origins = { "http://localhost:4200", "http://localhost:4201" })
public class TeamController {

    @Autowired
    private TeamService teamService;

    @GetMapping
    public ResponseEntity<List<Team>> getAllTeams() {
        return ResponseEntity.ok(teamService.getTeams());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTeamById(@PathVariable Long id) {
        Team team = teamService.getTeamById(id);
        if (team != null) return ResponseEntity.ok(team);
        return ResponseEntity.status(404).body(Map.of("error", "Team not found"));
    }

    /**
     * Create a team. Body must include name and directeurId.
     * Example: { "name": "Marketing Team", "directeurId": 3 }
     */
    @PostMapping
    public ResponseEntity<?> addTeam(@RequestBody Map<String, Object> body) {
        try {
            String name = (String) body.get("name");
            if (name == null || name.isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "Team name is required"));

            Object dirId = body.get("directeurId");
            if (dirId == null)
                return ResponseEntity.badRequest().body(Map.of("error", "directeurId is required"));

            Long directeurId = Long.valueOf(dirId.toString());
            Team created = teamService.createTeam(name, directeurId);
            return ResponseEntity.status(201).body(created);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTeam(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            String name = (String) body.get("name");
            if (name == null || name.isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "Team name is required"));

            Team updated = teamService.updateTeamName(id, name);
            if (updated != null) return ResponseEntity.ok(updated);
            return ResponseEntity.status(404).body(Map.of("error", "Team not found"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTeam(@PathVariable Long id) {
        if (teamService.getTeamById(id) == null)
            return ResponseEntity.status(404).body(Map.of("error", "Team not found"));
        teamService.deleteTeam(id);
        return ResponseEntity.noContent().build();
    }

    /** Assign or change the directeur of a team */
    @PutMapping("/{id}/directeur/{gestionnaireId}")
    public ResponseEntity<?> changeDirecteur(@PathVariable Long id, @PathVariable Long gestionnaireId) {
        try {
            Team team = teamService.changeDirecteur(id, gestionnaireId);
            if (team != null) return ResponseEntity.ok(team);
            return ResponseEntity.status(404).body(Map.of("error", "Team not found"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Add a gestionnaire as a member (must not already be in another team) */
    @PostMapping("/{id}/members/{gestionnaireId}")
    public ResponseEntity<?> addMember(@PathVariable Long id, @PathVariable Long gestionnaireId) {
        try {
            Team team = teamService.addMember(id, gestionnaireId);
            if (team != null) return ResponseEntity.ok(team);
            return ResponseEntity.status(404).body(Map.of("error", "Team not found"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Remove a gestionnaire from a team */
    @DeleteMapping("/{id}/members/{gestionnaireId}")
    public ResponseEntity<?> removeMember(@PathVariable Long id, @PathVariable Long gestionnaireId) {
        try {
            Team team = teamService.removeMember(id, gestionnaireId);
            if (team != null) return ResponseEntity.ok(team);
            return ResponseEntity.status(404).body(Map.of("error", "Team not found"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
