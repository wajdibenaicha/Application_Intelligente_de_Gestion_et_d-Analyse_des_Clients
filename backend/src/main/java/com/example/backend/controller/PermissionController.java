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
        if (permission != null) return ResponseEntity.ok(permission);
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> addPermission(@RequestBody Permission permission) {
        if (permission.getDescription() == null || permission.getDescription().isBlank())
            return ResponseEntity.badRequest().body("La description de la permission est obligatoire");
        return ResponseEntity.status(HttpStatus.CREATED).body(permissionService.addPermission(permission));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePermission(@PathVariable Long id, @RequestBody Permission permission) {
        if (permission.getDescription() == null || permission.getDescription().isBlank())
            return ResponseEntity.badRequest().body("La description de la permission est obligatoire");
        Permission updated = permissionService.updatePermission(id, permission);
        if (updated != null) return ResponseEntity.ok(updated);
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Permission> deletePermission(@PathVariable Long id) {
        Permission deleted = permissionService.deletePermission(id);
        if (deleted != null) return ResponseEntity.ok(deleted);
        return ResponseEntity.notFound().build();
    }
}
