package com.example.backend.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.backend.Repository.PermissionRepository;
import com.example.backend.Repository.RoleRepository;
import com.example.backend.models.Permission;
import com.example.backend.models.Role;

@Service
public class RoleService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    public Role getRoleById(Long id) {
        return roleRepository.findById(id).orElse(null);
    }

    public Role addRole(Role role) {
        resolvePermissions(role);
        Role saved = roleRepository.save(role);
        messagingTemplate.convertAndSend("/topic/roles", getAllRoles());
        return saved;
    }

    public Role updateRole(Long id, Role role) {
        Role existing = getRoleById(id);
        if (existing != null) {
            role.setId(id);
            resolvePermissions(role);
            Role updated = roleRepository.save(role);
            messagingTemplate.convertAndSend("/topic/roles", getAllRoles());
            return updated;
        }
        return null;
    }

    public Role deleteRole(Long id) {
        Role existing = getRoleById(id);
        if (existing != null) {
            roleRepository.delete(existing);
            messagingTemplate.convertAndSend("/topic/roles", getAllRoles());
            return existing;
        }
        return null;
    }

    private void resolvePermissions(Role role) {
        if (role.getPermissions() != null) {
            List<Permission> resolved = role.getPermissions().stream()
                .filter(p -> p.getId() != null)
                .map(p -> permissionRepository.findById(p.getId()).orElse(null))
                .filter(p -> p != null)
                .collect(Collectors.toList());
            role.setPermissions(resolved);
        }
    }
}
