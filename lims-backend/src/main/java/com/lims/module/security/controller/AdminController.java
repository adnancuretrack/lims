package com.lims.module.security.controller;

import com.lims.module.security.dto.CreateUserRequest;
import com.lims.module.security.dto.UpdateUserRequest;
import com.lims.module.security.dto.UserDTO;
import com.lims.module.security.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Administrative endpoints")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @PostMapping("/users")
    @Operation(summary = "Create user")
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.ok(adminService.createUser(request));
    }

    @GetMapping("/users")
    @Operation(summary = "List all users")
    public ResponseEntity<List<UserDTO>> listUsers() {
        return ResponseEntity.ok(adminService.listUsers());
    }

    @GetMapping("/roles")
    @Operation(summary = "List all available roles")
    public ResponseEntity<List<String>> listRoles() {
        return ResponseEntity.ok(adminService.listRoles());
    }

    @PutMapping("/users/{id}")
    @Operation(summary = "Update user")
    public ResponseEntity<UserDTO> updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(adminService.updateUser(id, request));
    }
}
