package com.example.backend.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.backend.Repository.PermissionRepository;
import com.example.backend.models.Permission;

@Service
public class PermissionService {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private PermissionRepository permissionRepository;

    public List<Permission> getAllPermissions() {
        return permissionRepository.findAll();
    }

    public Permission getPermissionById(Long id) {
        return permissionRepository.findById(id).orElse(null);
    }

    public Permission addPermission(Permission permission) {
        Permission saved = permissionRepository.save(permission);
        messagingTemplate.convertAndSend("/topic/permissions", getAllPermissions());
        return saved;
    }

    public Permission updatePermission(Long id, Permission permission) {
        Permission existing = getPermissionById(id);
        if (existing != null) {
            permission.setId(id);
            Permission updated = permissionRepository.save(permission);
            messagingTemplate.convertAndSend("/topic/permissions", getAllPermissions());
            return updated;
        }
        return null;
    }

    public Permission deletePermission(Long id) {
        Permission existing = getPermissionById(id);
        if (existing != null) {
            permissionRepository.delete(existing);
            messagingTemplate.convertAndSend("/topic/permissions", getAllPermissions());
            return existing;
        }
        return null;
    }
}
