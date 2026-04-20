package com.lims.module.sample.controller;

import com.lims.module.sample.service.DevService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
@Tag(name = "Developer Utilities", description = "Endpoints for development and testing only")
@Slf4j
public class DevController {

    private final DevService devService;

    @PostConstruct
    public void init() {
        log.info("DevController successfully initialized and mapped to /api/dev");
    }

    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }

    @PostMapping("/wipe-samples")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Wipe all samples and transactional data (Dev only)")
    public ResponseEntity<String> wipeSamples() {
        log.info("Received request to wipe all samples...");
        devService.wipeAllSamples();
        return ResponseEntity.ok("Successfully wiped all transactional sample data and physical files.");
    }
}
