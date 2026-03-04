package com.example.backend.service;

import com.example.backend.Repository.PermissionRepository;
import com.example.backend.models.Permission;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;


@Service
public class PermissionService {
    @Autowired
    private PermissionRepository permissionRepository;

    public List<Permission> getAllPermissions() {
        return permissionRepository.findAll();
    }

    public Permission getPermissionById(Long id) {
        return permissionRepository.findById(id).orElse(null);
    }

    public Permission addPermission(Permission permission) {
        return permissionRepository.save(permission);
    }

    public Permission updatePermission(Long id, Permission permission) {
        Permission existing = getPermissionById(id);
        if (existing != null) {
            permission.setId(id);
            return permissionRepository.save(permission);
        }
        return null;
    }

    public Permission deletePermission(Long id) {
        Permission existing = getPermissionById(id);
        if (existing != null) {
            permissionRepository.delete(existing);
            return existing;
        }
        return null;
    }
}
