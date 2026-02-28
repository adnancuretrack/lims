package com.lims.module.qc.controller;

import com.lims.module.qc.dto.*;
import com.lims.module.qc.repository.QcDataPointRepository;
import com.lims.module.qc.service.QcService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@RestController
@RequestMapping("/api/qc")
@RequiredArgsConstructor
@Tag(name = "Quality Control", description = "QC control chart management and Westgard rule monitoring")
public class QcController {

    private final QcService qcService;
    private final QcDataPointRepository dataPointRepository;

    @PostMapping("/charts")
    @Operation(summary = "Create a new QC control chart")
    public ResponseEntity<QcChartDTO> createChart(@Valid @RequestBody CreateQcChartRequest request) {
        return ResponseEntity.ok(qcService.createChart(request));
    }

    @GetMapping("/charts")
    @Operation(summary = "List all QC control charts")
    public ResponseEntity<List<QcChartDTO>> listCharts() {
        return ResponseEntity.ok(qcService.listCharts());
    }

    @GetMapping("/charts/{id}")
    @Operation(summary = "Get a QC chart with all data points")
    public ResponseEntity<QcChartDTO> getChart(@PathVariable Long id) {
        return ResponseEntity.ok(qcService.getChartWithData(id));
    }

    @PostMapping("/charts/{id}/data")
    @Operation(summary = "Add a new data point to a QC chart (auto-checks Westgard rules)")
    public ResponseEntity<QcDataPointDTO> addDataPoint(
            @PathVariable Long id,
            @Valid @RequestBody AddDataPointRequest request) {
        return ResponseEntity.ok(qcService.addDataPoint(id, request));
    }

    @GetMapping("/charts/{id}/stats")
    @Operation(summary = "Get statistical summary for a QC chart (mean, SD, Cpk)")
    public ResponseEntity<QcChartStatsDTO> getChartStats(@PathVariable Long id) {
        return ResponseEntity.ok(qcService.getChartStatistics(id));
    }

    @GetMapping("/violations/count")
    @Operation(summary = "Count Westgard violations across all charts in the last N days")
    public ResponseEntity<Long> countRecentViolations(
            @RequestParam(defaultValue = "7") int days) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        return ResponseEntity.ok(dataPointRepository.countViolationsSince(since));
    }
}
