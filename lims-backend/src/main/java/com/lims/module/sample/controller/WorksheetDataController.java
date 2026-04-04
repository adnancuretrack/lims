package com.lims.module.sample.controller;

import com.lims.module.sample.dto.WorksheetSubmitRequest;
import com.lims.module.sample.service.ReportService;
import com.lims.module.sample.service.WorksheetAuditService;
import com.lims.module.sample.service.WorksheetDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/worksheet")
@RequiredArgsConstructor
@Tag(name = "Worksheet", description = "Dynamic worksheet data entry endpoints")
public class WorksheetDataController {

    private final WorksheetDataService worksheetDataService;
    private final ReportService reportService;
    private final WorksheetAuditService worksheetAuditService;

    @GetMapping("/{sampleTestId}")
    @Operation(summary = "Get worksheet schema and data")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST', 'TECHNICIAN')")
    public ResponseEntity<Map<String, Object>> getWorksheet(@PathVariable Long sampleTestId) {
        return ResponseEntity.ok(worksheetDataService.getWorksheet(sampleTestId));
    }

    @GetMapping("/{sampleTestId}/history")
    @Operation(summary = "Get worksheet revision history")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST', 'TECHNICIAN')")
    public ResponseEntity<List<Map<String, Object>>> getHistory(@PathVariable Long sampleTestId) {
        return ResponseEntity.ok(worksheetAuditService.getRevisionHistory(sampleTestId));
    }

    @PutMapping("/{sampleTestId}/draft")
    @Operation(summary = "Save worksheet draft")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST', 'TECHNICIAN')")
    public ResponseEntity<Void> saveDraft(
            @PathVariable Long sampleTestId,
            @RequestBody Map<String, Object> data) {
        worksheetDataService.saveDraft(sampleTestId, data);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{sampleTestId}/submit")
    @Operation(summary = "Submit worksheet for review")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST', 'TECHNICIAN')")
    public ResponseEntity<Void> submitWorksheet(
            @PathVariable Long sampleTestId,
            @RequestBody WorksheetSubmitRequest request) {
        worksheetDataService.submitWorksheet(sampleTestId, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{sampleTestId}/report")
    @Operation(summary = "Generate and download worksheet report PDF")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST', 'TECHNICIAN')")
    public ResponseEntity<byte[]> downloadReport(@PathVariable Long sampleTestId) {
        byte[] pdfBytes = reportService.generateWorksheetReport(sampleTestId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"worksheet_report_" + sampleTestId + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
}
