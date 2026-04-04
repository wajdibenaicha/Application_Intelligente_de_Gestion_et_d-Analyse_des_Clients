package com.example.backend.controller;

import com.example.backend.service.NotificationService;
import com.example.backend.models.Notification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:4200")
public class NotificationController {
    @Autowired
    private NotificationService notificationService;

    @GetMapping("/admin")
    public List<Notification> getNonVues() {
        return notificationService.getAllNonVues();
    }

    @PostMapping("/{id}/vue")
    public void marquerVue(@PathVariable Long id) {
        notificationService.marquerVue(id);
    }
}