package com.lims.module.sample.service;

import com.lims.module.sample.dto.OverdueSampleDTO;
import com.lims.module.sample.dto.TatReportDTO;
import com.lims.module.sample.dto.WorkloadReportDTO;
import com.lims.module.sample.entity.Sample;
import com.lims.module.sample.entity.SampleTest;
import com.lims.module.sample.repository.SampleRepository;
import com.lims.module.sample.repository.SampleTestRepository;
import lombok.RequiredArgsConstructor;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final SampleRepository sampleRepository;
    private final SampleTestRepository sampleTestRepository;

    // ==================== CoA Report ====================

    public byte[] generateCoa(Long sampleId) throws JRException {
        Sample sample = sampleRepository.findById(sampleId)
                .orElseThrow(() -> new RuntimeException("Sample not found"));

        if (!"AUTHORIZED".equals(sample.getStatus())) {
            throw new IllegalStateException("CoA can only be generated for AUTHORIZED samples");
        }

        List<SampleTest> tests = sampleTestRepository.findBySampleIdOrderBySortOrderAscIdAsc(sampleId);

        // Prepare Jasper report parameters
        Map<String, Object> params = new HashMap<>();
        params.put("sampleNumber", sample.getSampleNumber());
        params.put("clientName", sample.getJob().getClient().getName());
        params.put("productName", sample.getProduct().getName());
        params.put("receivedAt", sample.getReceivedAt() != null ? sample.getReceivedAt().toString() : "N/A");
        params.put("authorizedAt", sample.getUpdatedAt() != null ? sample.getUpdatedAt().toString() : "N/A");

        // Map tests to beans for Jasper
        List<Map<String, Object>> testData = tests.stream().map(t -> {
            Map<String, Object> map = new HashMap<>();
            map.put("testName", t.getTestMethod().getName());
            map.put("methodName", t.getTestMethod().getCode());
            map.put("result", t.getLastResult() != null ? t.getLastResult().getDisplayValue() : "N/A");
            map.put("units", t.getTestMethod().getUnit());
            map.put("limits", t.getTestMethod().getLimitsDisplay());
            return map;
        }).collect(Collectors.toList());

        JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(testData);

        // Load template
        InputStream template = getClass().getResourceAsStream("/reports/coa_template.jrxml");
        JasperReport jasperReport = JasperCompileManager.compileReport(template);

        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, dataSource);

        return JasperExportManager.exportReportToPdf(jasperPrint);
    }

    // ==================== TAT Report ====================

    @Transactional(readOnly = true)
    public List<TatReportDTO> getTatReport() {
        return sampleRepository.getTatStatsByStatus().stream()
                .map(row -> TatReportDTO.builder()
                        .status((String) row[0])
                        .count(((Number) row[1]).longValue())
                        .averageTatHours(((Number) row[2]).doubleValue())
                        .minTatHours(((Number) row[3]).doubleValue())
                        .maxTatHours(((Number) row[4]).doubleValue())
                        .build())
                .collect(Collectors.toList());
    }

    // ==================== Workload Report ====================

    @Transactional(readOnly = true)
    public List<WorkloadReportDTO> getWorkloadReport() {
        return sampleTestRepository.getWorkloadByAnalyst().stream()
                .map(row -> WorkloadReportDTO.builder()
                        .analystName((String) row[0])
                        .samplesAssigned(((Number) row[1]).longValue())
                        .testsCompleted(((Number) row[2]).longValue())
                        .testsPending(((Number) row[3]).longValue())
                        .build())
                .collect(Collectors.toList());
    }

    // ==================== Overdue Samples Report ====================

    @Transactional(readOnly = true)
    public List<OverdueSampleDTO> getOverdueReport() {
        Instant now = Instant.now();
        return sampleRepository.findOverdueSamples(now).stream()
                .map(s -> OverdueSampleDTO.builder()
                        .sampleId(s.getId())
                        .sampleNumber(s.getSampleNumber())
                        .clientName(s.getJob() != null && s.getJob().getClient() != null
                                ? s.getJob().getClient().getName() : "N/A")
                        .productName(s.getProduct() != null ? s.getProduct().getName() : "N/A")
                        .status(s.getStatus())
                        .dueDate(s.getDueDate())
                        .daysOverdue(Duration.between(s.getDueDate(), now).toDays())
                        .assignedTo(s.getAssignedTo() != null
                                ? s.getAssignedTo().getDisplayName() : "Unassigned")
                        .build())
                .collect(Collectors.toList());
    }
}
