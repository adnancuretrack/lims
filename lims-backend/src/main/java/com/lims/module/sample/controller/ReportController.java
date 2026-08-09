package com.lims.module.sample.controller;

import com.lims.module.sample.dto.OverdueSampleDTO;
import com.lims.module.sample.dto.TatReportDTO;
import com.lims.module.sample.dto.WorkloadReportDTO;
import com.lims.module.sample.service.ReportService;
import com.lims.module.sample.repository.CoaRevisionRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import net.sf.jasperreports.engine.JRException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'LAB_MANAGER', 'ANALYST', 'REVIEWER', 'AUTHORIZER', 'VIEWER')")
@Tag(name = "Reports", description = "Endpoints for generating system reports and documents")
public class ReportController {

    private final ReportService reportService;
    private final CoaRevisionRepository coaRevisionRepository;

    @GetMapping("/coa/{sampleId}")
    @Operation(summary = "Generate and download Certificate of Analysis (COA) for a sample")
    public ResponseEntity<byte[]> downloadCoa(@PathVariable Long sampleId) throws JRException {
        byte[] pdf = reportService.generateCoa(sampleId);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"COA_" + sampleId + ".pdf\"")
                .body(pdf);
    }

    @GetMapping("/coa/{sampleId}/revisions")
    @Operation(summary = "Get list of all Certificate of Analysis (COA) revisions/snapshots for a sample")
    public ResponseEntity<List<com.lims.module.sample.dto.CoaRevisionDTO>> getCoaRevisions(@PathVariable Long sampleId) {
        List<com.lims.module.sample.dto.CoaRevisionDTO> revisions = coaRevisionRepository.findBySampleIdOrderByRevisionNumberDesc(sampleId)
                .stream().map(r -> com.lims.module.sample.dto.CoaRevisionDTO.builder()
                        .id(r.getId())
                        .sampleId(r.getSample().getId())
                        .revisionNumber(r.getRevisionNumber())
                        .isInterim(r.isInterim())
                        .specimensIncluded(r.getSpecimensIncluded())
                        .specimensTotal(r.getSpecimensTotal())
                        .generatedBy(r.getGeneratedBy() != null ? r.getGeneratedBy().getDisplayName() : "System")
                        .generatedAt(r.getGeneratedAt())
                        .notes(r.getNotes())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(revisions);
    }

    @GetMapping("/coa/revisions/{revisionId}/download")
    @Operation(summary = "Download a specific Certificate of Analysis (COA) revision PDF snapshot")
    public ResponseEntity<byte[]> downloadCoaRevision(@PathVariable Long revisionId) {
        com.lims.module.sample.entity.CoaRevision revision = coaRevisionRepository.findById(revisionId)
                .orElseThrow(() -> new RuntimeException("COA Revision not found: " + revisionId));

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"COA_" + revision.getSample().getSampleNumber() + "_Rev_" + revision.getRevisionNumber() + ".pdf\"")
                .body(revision.getPdfSnapshot());
    }

    @GetMapping("/trf/{sampleId}")
    @Operation(summary = "Generate and download Test Request Form (TRF) for a sample")
    public ResponseEntity<byte[]> downloadTrf(@PathVariable Long sampleId) throws JRException {
        byte[] pdf = reportService.generateTrf(sampleId);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"TRF_" + sampleId + ".pdf\"")
                .body(pdf);
    }

    @GetMapping("/tat")
    @PreAuthorize("hasAnyRole('ADMIN', 'LAB_MANAGER')")
    @Operation(summary = "Turnaround time summary grouped by sample status")
    public ResponseEntity<List<TatReportDTO>> getTatReport() {
        return ResponseEntity.ok(reportService.getTatReport());
    }

    @GetMapping("/workload")
    @PreAuthorize("hasAnyRole('ADMIN', 'LAB_MANAGER')")
    @Operation(summary = "Analyst workload breakdown — tests assigned, completed, and pending")
    public ResponseEntity<List<WorkloadReportDTO>> getWorkloadReport() {
        return ResponseEntity.ok(reportService.getWorkloadReport());
    }

    @GetMapping("/overdue")
    @PreAuthorize("hasAnyRole('ADMIN', 'LAB_MANAGER')")
    @Operation(summary = "Samples past their due date that are still in progress")
    public ResponseEntity<List<OverdueSampleDTO>> getOverdueReport() {
        return ResponseEntity.ok(reportService.getOverdueReport());
    }
}
