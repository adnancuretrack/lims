package com.lims.module.erp.controller;

import com.lims.module.erp.dto.ErpJobImportRequest;
import com.lims.module.erp.service.ErpIntegrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/erp")
@RequiredArgsConstructor
@Tag(name = "ERP Integration", description = "Endpoints for external system integration (Simulated SAP/Oracle)")
public class ErpIntegrationController {

    private final ErpIntegrationService erpService;

    @PostMapping("/import-job")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Import a job order from an external system")
    public ResponseEntity<String> importJob(@RequestBody ErpJobImportRequest request) {
        String internalJobNumber = erpService.importJob(request);
        return ResponseEntity.ok("Successfully imported as Job: " + internalJobNumber);
    }

    @PostMapping("/export-job/{jobId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Simulate exporting results back to ERP")
    public ResponseEntity<String> exportJob(@PathVariable Long jobId) {
        erpService.exportResults(jobId);
        return ResponseEntity.ok("Result export triggered for Job ID: " + jobId);
    }
}
