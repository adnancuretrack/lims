package com.lims.module.investigation.controller;

import com.lims.module.investigation.dto.CreateInvestigationRequest;
import com.lims.module.investigation.dto.InvestigationDTO;
import com.lims.module.investigation.dto.UpdateInvestigationRequest;
import com.lims.module.investigation.repository.InvestigationRepository;
import com.lims.module.investigation.service.InvestigationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/investigations")
@RequiredArgsConstructor
@Tag(name = "Investigation & NCR", description = "Manage Non-Conformance Reports (NCR) and CAPA investigations")
public class InvestigationController {

    private final InvestigationService investigationService;
    private final InvestigationRepository investigationRepository;

    @PostMapping
    @Operation(summary = "Create a new investigation (NCR)")
    public ResponseEntity<InvestigationDTO> createInvestigation(@Valid @RequestBody CreateInvestigationRequest request) {
        return ResponseEntity.ok(investigationService.createInvestigation(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update investigation details or status")
    public ResponseEntity<InvestigationDTO> updateInvestigation(
            @PathVariable Long id,
            @RequestBody UpdateInvestigationRequest request) {
        return ResponseEntity.ok(investigationService.updateInvestigation(id, request));
    }

    @GetMapping
    @Operation(summary = "List all investigations (Newest first)")
    public ResponseEntity<List<InvestigationDTO>> getAllInvestigations() {
        return ResponseEntity.ok(investigationService.getAllInvestigations());
    }

    @GetMapping("/my")
    @Operation(summary = "List investigations assigned to the current user")
    public ResponseEntity<List<InvestigationDTO>> getMyInvestigations() {
        return ResponseEntity.ok(investigationService.getMyInvestigations());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get investigation details by ID")
    public ResponseEntity<InvestigationDTO> getInvestigation(@PathVariable Long id) {
        return ResponseEntity.ok(investigationService.getInvestigation(id));
    }

    @GetMapping("/stats/open")
    @Operation(summary = "Count of open investigations")
    public ResponseEntity<Long> getOpenCount() {
        return ResponseEntity.ok(investigationRepository.countOpenInvestigations());
    }
}
