package com.example.backend.Repository;

import com.example.backend.models.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByVueFalseOrderByDateCreationDesc();
}