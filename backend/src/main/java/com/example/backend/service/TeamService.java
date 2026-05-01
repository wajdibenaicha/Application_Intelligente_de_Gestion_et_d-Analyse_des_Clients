package com.example.backend.service;

import org.springframework.stereotype.Service;
import com.example.backend.Repository.TeamRepository;
import com.example.backend.Repository.GestionnaireRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.util.List;
import com.example.backend.models.Team;
import com.example.backend.models.Gestionnaire;


@Service
public class TeamService {

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private GestionnaireRepository gestionnaireRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private void broadcastTeams() {
        messagingTemplate.convertAndSend("/topic/teams", teamRepository.findAll());
    }


    public List<Team> getTeams() {
        return teamRepository.findAll();
    }

    public Team getTeamById(Long id) {
        return teamRepository.findById(id).orElse(null);
    }

    public Team createTeam(String name, Long directeurId) {
        Gestionnaire directeur = gestionnaireRepository.findById(directeurId)
                .orElseThrow(() -> new RuntimeException("Directeur not found"));
        if (directeur.getRole() == null || !"DIRECTEUR".equalsIgnoreCase(directeur.getRole().getName())) {
            throw new RuntimeException("Only a gestionnaire with role DIRECTEUR can manage a team");
        }
        Team team = new Team();
        team.setName(name);
        team.setDirecteur(directeur);
        Team saved = teamRepository.save(team);
        broadcastTeams();
        return saved;
    }

    public Team updateTeamName(Long id, String name) {
        Team team = getTeamById(id);
        if (team == null) return null;
        team.setName(name);
        Team saved = teamRepository.save(team);
        broadcastTeams();
        return saved;
    }

    public void deleteTeam(Long id) {
        
        List<Gestionnaire> members = gestionnaireRepository.findAll().stream()
                .filter(g -> g.getTeam() != null && g.getTeam().getId().equals(id))
                .toList();
        members.forEach(g -> { g.setTeam(null); gestionnaireRepository.save(g); });
        teamRepository.deleteById(id);
        broadcastTeams();
    }

    

    public Team addMember(Long teamId, Long gestionnaireId) {
        Team team = getTeamById(teamId);
        if (team == null) return null;

        Gestionnaire member = gestionnaireRepository.findById(gestionnaireId)
                .orElseThrow(() -> new RuntimeException("Gestionnaire not found"));

        if (member.getTeam() != null) {
            throw new RuntimeException(
                "Gestionnaire already belongs to team '" + member.getTeam().getName() + "'");
        }

        member.setTeam(team);
        gestionnaireRepository.save(member);

    
        Team updated = teamRepository.findById(teamId).orElse(team);
        broadcastTeams();
        return updated;
    }

    public Team removeMember(Long teamId, Long gestionnaireId) {
        Team team = getTeamById(teamId);
        if (team == null) return null;

        Gestionnaire member = gestionnaireRepository.findById(gestionnaireId)
                .orElseThrow(() -> new RuntimeException("Gestionnaire not found"));

        
        member.setTeam(null);
        gestionnaireRepository.save(member);

        Team updated = teamRepository.findById(teamId).orElse(team);
        broadcastTeams();
        return updated;
    }


    public Team changeDirecteur(Long teamId, Long gestionnaireId) {
        Team team = getTeamById(teamId);
        if (team == null) return null;

        Gestionnaire directeur = gestionnaireRepository.findById(gestionnaireId)
                .orElseThrow(() -> new RuntimeException("Gestionnaire not found"));

        if (directeur.getRole() == null || !"DIRECTEUR".equalsIgnoreCase(directeur.getRole().getName())) {
            throw new RuntimeException("Only a gestionnaire with role DIRECTEUR can manage a team");
        }

        team.setDirecteur(directeur);
        Team saved = teamRepository.save(team);
        broadcastTeams();
        return saved;
    }
}
