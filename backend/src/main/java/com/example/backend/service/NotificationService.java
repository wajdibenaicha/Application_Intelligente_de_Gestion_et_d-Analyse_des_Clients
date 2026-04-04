package com.example.backend.service;

import com.example.backend.Repository.NotificationRepository;
import com.example.backend.models.Notification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class NotificationService {
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public Notification createNotification(String type, String message, Long sourceId, String sourceType) {
        Notification notif = new Notification();
        notif.setType(type);
        notif.setMessage(message);
        notif.setSourceId(sourceId);
        notif.setSourceType(sourceType);
        Notification saved = notificationRepository.save(notif);
        messagingTemplate.convertAndSend("/topic/admin/notifications", getAllNonVues());
        return saved;
    }

    public List<Notification> getAllNonVues() {
        return notificationRepository.findByVueFalseOrderByDateCreationDesc();
    }

    public void marquerVue(Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setVue(true);
            notificationRepository.save(n);
        });
    }

    public void deleteBySource(Long sourceId, String sourceType) {
        List<Notification> all = notificationRepository.findAll();
        for (Notification n : all) {
            if (n.getSourceId().equals(sourceId) && n.getSourceType().equals(sourceType)) {
                notificationRepository.delete(n);
            }
        }
        messagingTemplate.convertAndSend("/topic/admin/notifications", getAllNonVues());
    }
}