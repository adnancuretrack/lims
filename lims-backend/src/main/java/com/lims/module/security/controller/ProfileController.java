package com.lims.module.security.controller;

import com.lims.module.security.dto.UpdateProfileRequest;
import com.lims.module.security.dto.UserProfileDTO;
import com.lims.module.security.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
@Tag(name = "Profile", description = "User profile self-service endpoints")
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping
    @Operation(summary = "Get current user profile")
    public ResponseEntity<UserProfileDTO> getProfile() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(profileService.getProfile(username));
    }

    @PutMapping
    @Operation(summary = "Update current user profile")
    public ResponseEntity<UserProfileDTO> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(profileService.updateProfile(username, request));
    }

    @PostMapping("/signature")
    @Operation(summary = "Upload signature image")
    public ResponseEntity<Void> uploadSignature(@RequestParam("file") MultipartFile file) throws IOException {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        profileService.uploadSignature(username, file);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/signature")
    @Operation(summary = "Get signature image")
    public ResponseEntity<Resource> getSignature() throws IOException {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Path path = profileService.getSignatureFile(username);
        Resource resource = new UrlResource(path.toUri());

        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG) // or infer from file
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}
