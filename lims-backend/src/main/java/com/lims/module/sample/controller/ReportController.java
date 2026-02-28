package com.lims.module.sample.controller;

import com.lims.module.sample.dto.OverdueSampleDTO;
import com.lims.module.sample.dto.TatReportDTO;
import com.lims.module.sample.dto.WorkloadReportDTO;
import com.lims.module.sample.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import net.sf.jasperreports.engine.JRException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Endpoints for generating system reports and documents")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/coa/{sampleId}")
    @Operation(summary = "Generate and download Certificate of Analysis (COA) for a sample")
    public ResponseEntity<byte[]> downloadCoa(@PathVariable Long sampleId) throws JRException {
        byte[] pdf = reportService.generateCoa(sampleId);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"COA_" + sampleId + ".pdf\"")
                .body(pdf);
    }

    @GetMapping("/tat")
    @Operation(summary = "Turnaround time summary grouped by sample status")
    public ResponseEntity<List<TatReportDTO>> getTatReport() {
        return ResponseEntity.ok(reportService.getTatReport());
    }

    @GetMapping("/workload")
    @Operation(summary = "Analyst workload breakdown — tests assigned, completed, and pending")
    public ResponseEntity<List<WorkloadReportDTO>> getWorkloadReport() {
        return ResponseEntity.ok(reportService.getWorkloadReport());
    }

    @GetMapping("/overdue")
    @Operation(summary = "Samples past their due date that are still in progress")
    public ResponseEntity<List<OverdueSampleDTO>> getOverdueReport() {
        return ResponseEntity.ok(reportService.getOverdueReport());
    }
}
