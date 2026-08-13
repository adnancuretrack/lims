package com.lims.module.sample.controller;

import com.lims.module.sample.entity.Sample;
import com.lims.module.sample.repository.SampleRepository;
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

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
@Tag(name = "Public COA Verification", description = "Public endpoint for QR code verification of authorized COAs")
public class PublicCoaController {

    private final ReportService reportService;
    private final SampleRepository sampleRepository;

    @GetMapping("/coa/{sampleId}")
    @Operation(summary = "Get authorized Certificate of Analysis (COA) PDF for public verification")
    public ResponseEntity<byte[]> getPublicCoa(@PathVariable Long sampleId) throws JRException {
        Sample sample = sampleRepository.findById(sampleId)
                .orElse(null);

        if (sample == null || !"AUTHORIZED".equals(sample.getStatus())) {
            return ResponseEntity.notFound().build();
        }

        byte[] pdf = reportService.generateCoa(sampleId);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"COA_" + sample.getSampleNumber() + ".pdf\"")
                .body(pdf);
    }
}
