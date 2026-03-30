package com.example.backend.controller;

import com.example.backend.models.Permission;
import com.example.backend.service.PermissionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/permissions")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:4201"})
public class PermissionController {

    @Autowired
    private PermissionService permissionService;

    @GetMapping
    public ResponseEntity<List<Permission>> getAllPermissions() {
        return ResponseEntity.ok(permissionService.getAllPermissions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Permission> getPermissionById(@PathVariable Long id) {
        Permission permission = permissionService.getPermissionById(id);
        if (permission != null) {
            return ResponseEntity.ok(permission);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Permission> addPermission(@RequestBody Permission permission) {
        Permission savedPermission = permissionService.addPermission(permission);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedPermission);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Permission> updatePermission(@PathVariable Long id, @RequestBody Permission permission) {
        Permission updatedPermission = permissionService.updatePermission(id, permission);
        if (updatedPermission != null) {
            return ResponseEntity.ok(updatedPermission);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Permission> deletePermission(@PathVariable Long id) {
        Permission deletedPermission = permissionService.deletePermission(id);
        if (deletedPermission != null) {
            return ResponseEntity.ok(deletedPermission);
        }
        return ResponseEntity.notFound().build();
    }
}
