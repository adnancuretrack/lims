package com.lims.module.sample.controller;

import com.lims.module.sample.dto.JobDTO;
import com.lims.module.sample.dto.SampleDTO;
import com.lims.module.sample.dto.DashboardStatsDTO;
import com.lims.module.sample.dto.SampleRegistrationRequest;
import com.lims.module.sample.dto.SampleReceiptRequest;
import com.lims.module.sample.dto.SampleRejectionRequest;
import com.lims.module.sample.service.SampleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/samples")
@RequiredArgsConstructor
@Tag(name = "Sample Management", description = "Sample lifecycle endpoints")
public class SampleController {

    private final SampleService sampleService;

    @PostMapping("/register")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    @Operation(summary = "Register new samples (Job booking)")
    public ResponseEntity<JobDTO> registerJob(@Valid @RequestBody SampleRegistrationRequest request,
                                              Authentication authentication) {
        JobDTO job = sampleService.registerJob(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(job);
    }

    @GetMapping("/stats")
    @Operation(summary = "Get dashboard statistics")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'LAB_MANAGER', 'ANALYST')")
    public ResponseEntity<DashboardStatsDTO> getStats() {
        return ResponseEntity.ok(sampleService.getDashboardStats());
    }

    @GetMapping
    @Operation(summary = "List samples", description = "Paged list of samples")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'LAB_MANAGER', 'ANALYST')")
    public Page<SampleDTO> listSamples(Pageable pageable) {
        return sampleService.listSamples(pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get sample details")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'LAB_MANAGER', 'ANALYST')")
    public ResponseEntity<SampleDTO> getSample(@PathVariable Long id) {
        return ResponseEntity.ok(sampleService.getSampleDetails(id));
    }

    @GetMapping("/{id}/tests")
    @Operation(summary = "Get tests for a sample")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'LAB_MANAGER', 'ANALYST')")
    public ResponseEntity<List<com.lims.module.sample.dto.SampleTestDTO>> getSampleTests(@PathVariable Long id) {
        return ResponseEntity.ok(sampleService.getSampleTests(id));
    }

    @PatchMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    @Operation(summary = "Record sample receipt")
    public ResponseEntity<SampleDTO> receiveSample(@PathVariable Long id,
                                                 @Valid @RequestBody SampleReceiptRequest request,
                                                 Authentication authentication) {
        SampleDTO sample = sampleService.receiveSample(id, request, authentication.getName());
        return ResponseEntity.ok(sample);
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    @Operation(summary = "Reject sample")
    public ResponseEntity<SampleDTO> rejectSample(@PathVariable Long id,
                                                @Valid @RequestBody SampleRejectionRequest request,
                                                Authentication authentication) {
        SampleDTO sample = sampleService.rejectSample(id, request, authentication.getName());
        return ResponseEntity.ok(sample);
    }
}
