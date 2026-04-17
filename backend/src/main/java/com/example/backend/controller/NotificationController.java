package com.example.backend.controller;

import com.example.backend.service.NotificationService;
import com.example.backend.models.Notification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = { "http://localhost:4200", "http://localhost:4201" })
public class NotificationController {
    @Autowired
    private NotificationService notificationService;

    @GetMapping("/admin")
    public List<Notification> getAdminNotifications() {
        return notificationService.getAdminNotifications();
    }

    @GetMapping("/gestionnaire")
    public List<Notification> getGestionnaireNotifications() {
        return notificationService.getGestionnaireNotifications();
    }

    @PostMapping("/{id}/vue")
    public void marquerVue(@PathVariable Long id) {
        notificationService.marquerVue(id);
    }

    @PostMapping("/delegation")
    public ResponseEntity<?> sendDelegation(@RequestBody Map<String, Object> body) {
        try {
            Long directeurId    = Long.valueOf(body.get("directeurId").toString());
            Long gestionnaireId = Long.valueOf(body.get("gestionnaireId").toString());
            String titreHint    = body.getOrDefault("titreHint", "").toString();
            return ResponseEntity.ok(notificationService.sendDelegationRequest(directeurId, gestionnaireId, titreHint));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}