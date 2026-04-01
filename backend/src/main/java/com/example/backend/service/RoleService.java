package com.example.backend.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.backend.Repository.RoleRepository;
import com.example.backend.models.Role;


@Service
public class RoleService {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private RoleRepository roleRepository;

    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    public Role getRoleById(Long id) {
        return roleRepository.findById(id).orElse(null);
    }

    public Role addRole(Role role) {
        Role saved = roleRepository.save(role);
        messagingTemplate.convertAndSend("/topic/roles", getAllRoles());
        return saved;
    }

    public Role updateRole(Long id, Role role) {
        Role existing = getRoleById(id);
        if (existing != null) {
            role.setId(id);
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
}
