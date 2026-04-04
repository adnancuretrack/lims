package com.lims.module.sample.controller;

import com.lims.module.sample.dto.MethodDefinitionDTO;
import com.lims.module.sample.service.MethodDefinitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/test-methods/{testMethodId}/definitions")
@RequiredArgsConstructor
public class MethodDefinitionController {

    private final MethodDefinitionService methodDefinitionService; 

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST', 'TECHNICIAN')")
    public ResponseEntity<List<MethodDefinitionDTO>> getHistory(@PathVariable Long testMethodId) {
        return ResponseEntity.ok(methodDefinitionService.getHistory(testMethodId));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST', 'TECHNICIAN')")
    public ResponseEntity<MethodDefinitionDTO> getActiveDefinition(@PathVariable Long testMethodId) {
        return ResponseEntity.ok(methodDefinitionService.getActiveDefinition(testMethodId));
    }

    @PostMapping("/draft")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MethodDefinitionDTO> saveDraft(@PathVariable Long testMethodId,
                                                         @RequestBody MethodDefinitionDTO dto) {
        return ResponseEntity.ok(methodDefinitionService.saveDraft(testMethodId, dto));
    }

    @PostMapping("/publish")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MethodDefinitionDTO> publishDefinition(@PathVariable Long testMethodId,
                                                                 @RequestParam Long userId) {
        return ResponseEntity.ok(methodDefinitionService.publishDefinition(testMethodId, userId));
    }

    @PostMapping("/template")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MethodDefinitionDTO> uploadTemplate(@PathVariable Long testMethodId,
                                                              @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(methodDefinitionService.uploadTemplate(testMethodId, file));
    }
}
