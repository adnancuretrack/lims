package com.lims.module.sample.controller;

import com.lims.module.sample.dto.ResultEntryRequest;
import com.lims.module.sample.dto.SampleTestDTO;
import com.lims.module.sample.service.AnalysisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analysis")
@RequiredArgsConstructor
@Tag(name = "Analysis", description = "Laboratory analysis and result entry endpoints")
public class AnalysisController {

    private final AnalysisService analysisService;

    @GetMapping("/samples/{sampleId}/tests")
    @Operation(summary = "Get tests for a sample")
    public List<SampleTestDTO> getSampleTests(@PathVariable Long sampleId) {
        return analysisService.getTestsForSample(sampleId);
    }

    @PostMapping("/result")
    @Operation(summary = "Enter test result")
    @PreAuthorize("hasAnyRole('ADMIN', 'ANALYST')")
    public ResponseEntity<Void> enterResult(@RequestBody ResultEntryRequest request) {
        analysisService.enterResult(request);
        return ResponseEntity.ok().build();
    }
}
