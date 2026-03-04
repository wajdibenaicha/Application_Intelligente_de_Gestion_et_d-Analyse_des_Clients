package com.example.backend.service;

import com.example.backend.Repository.RoleRepository;
import com.example.backend.models.Role;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;


@Service
public class RoleService {
    @Autowired
    private RoleRepository roleRepository;

    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    public Role getRoleById(Long id) {
        return roleRepository.findById(id).orElse(null);
    }

    public Role addRole(Role role) {
        return roleRepository.save(role);
    }

    public Role updateRole(Long id, Role role) {
        Role existing = getRoleById(id);
        if (existing != null) {
            role.setId(id);
            return roleRepository.save(role);
        }
        return null;
    }

    public Role deleteRole(Long id) {
        Role existing = getRoleById(id);
        if (existing != null) {
            roleRepository.delete(existing);
            return existing;
        }
        return null;
    }
}
