package com.lims.module.sample.service;

import com.lims.module.sample.dto.OverdueSampleDTO;
import com.lims.module.sample.dto.TatReportDTO;
import com.lims.module.sample.dto.WorkloadReportDTO;
import com.lims.module.sample.entity.*;
import com.lims.module.sample.repository.SampleRepository;
import com.lims.module.sample.repository.SampleTestRepository;
import lombok.RequiredArgsConstructor;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final SampleRepository sampleRepository;
    private final SampleTestRepository sampleTestRepository;
    private final ResourceLoader resourceLoader;
    private final AttachmentService attachmentService;
    private final DocumentConversionService documentConversionService;
    private final ExcelReportService excelReportService;
    private final PdfConversionService pdfConversionService;
    private final com.lims.module.sample.repository.WorksheetDataRepository worksheetDataRepository;

    @Transactional(readOnly = true)
    public byte[] generateWorksheetReport(Long sampleTestId) {
        WorksheetData wd = worksheetDataRepository.findBySampleTestId(sampleTestId)
                .orElseThrow(() -> new RuntimeException("Worksheet data not found for test: " + sampleTestId));

        String templatePath = wd.getMethodDefinition().getReportTemplatePath();
        if (templatePath == null || templatePath.isEmpty()) {
            throw new IllegalStateException("No Excel report template configured for this method definition.");
        }

        try {
            // 1. Inject data into Excel
            Path excelPath = excelReportService.generateExcelReport(wd, templatePath);
            
            // 2. Convert to PDF
            Path pdfPath = pdfConversionService.convertExcelToPdf(excelPath);
            
            // 3. Read and cleanup
            byte[] bytes = Files.readAllBytes(pdfPath);
            
            // Cleanup temp files
            Files.deleteIfExists(pdfPath);
            Files.deleteIfExists(excelPath);
            
            return bytes;
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate worksheet report from Excel template", e);
        }
    }

    static {
        // Disable XML validation to avoid issues with external XSDs in restricted environments
        System.setProperty("net.sf.jasperreports.xml.validation", "false");
    }

    // ==================== CoA Report ====================

    @Transactional(readOnly = true)
    public byte[] generateCoa(Long sampleId) throws JRException {
        Sample sample = sampleRepository.findById(sampleId)
                .orElseThrow(() -> new RuntimeException("Sample not found"));

        if (!"AUTHORIZED".equals(sample.getStatus())) {
            throw new IllegalStateException("CoA can only be generated for AUTHORIZED samples");
        }

        List<SampleTest> tests = sampleTestRepository.findBySampleIdOrderBySortOrderAscIdAsc(sampleId);

        // Map Header Parameters (22 Fields)
        Map<String, Object> params = new HashMap<>();
        Job job = sample.getJob();
        Client client = job.getClient();
        Project project = job.getProject();

        // Left Column
        params.put("requestNo", sample.getSampleNumber());
        params.put("client", client.getName());
        params.put("postBox", client.getAddress() != null ? client.getAddress() : "N/A");
        params.put("contactPerson", project != null && project.getContactPerson() != null ? project.getContactPerson() : (client.getContactPerson() != null ? client.getContactPerson() : "N/A"));
        params.put("projectNo", project != null ? project.getProjectNumber() : "N/A");
        params.put("projectName", project != null ? project.getName() : (job.getProjectName() != null ? job.getProjectName() : "N/A"));
        params.put("consultant", project != null && project.getConsultant() != null ? project.getConsultant() : "N/A");
        params.put("contractor", project != null && project.getContractor() != null ? project.getContractor() : "N/A");
        params.put("projectLocation", project != null && project.getLocation() != null ? project.getLocation() : "N/A");
        params.put("telephone", project != null && project.getPhone() != null ? project.getPhone() : (client.getPhone() != null ? client.getPhone() : "N/A"));
        params.put("email", project != null && project.getEmail() != null ? project.getEmail() : (client.getEmail() != null ? client.getEmail() : "N/A"));

        // Right Column
        params.put("sampleType", sample.getProduct().getName());
        params.put("sampleDescription", sample.getDescription() != null ? sample.getDescription() : "N/A");
        params.put("sampleId", sample.getSampleNumber());
        params.put("source", sample.getSamplingPoint() != null ? sample.getSamplingPoint() : "N/A");
        params.put("sampledBy", sample.getSampledBy() != null ? sample.getSampledBy() : "N/A");
        params.put("sampleFrom", sample.getSamplingPoint() != null ? sample.getSamplingPoint() : "N/A");
        params.put("sampleCertNo", "N/A"); // Not in DB
        params.put("deliveredBy", "N/A"); // Not in DB
        params.put("sampledDateTime", sample.getSampledAt() != null ? sample.getSampledAt().toString() : "N/A");
        params.put("dateReceived", sample.getReceivedAt() != null ? sample.getReceivedAt().toString() : "N/A");
        params.put("quotationNo", job.getPoNumber() != null ? job.getPoNumber() : "N/A");

        params.put("authorizedAt", sample.getUpdatedAt() != null ? sample.getUpdatedAt().toString() : "N/A");
        
        // Footer Signatures
        params.put("preparedBy", "Lab Registrar"); 
        params.put("checkedBy", "Technical Manager");
        params.put("approvedBy", "Lab Director");

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

        // Convert attachments to images
        List<Attachment> attachments = attachmentService.getBySample(sampleId);
        List<Map<String, Object>> attachmentData = new ArrayList<>();
        for (Attachment att : attachments) {
            try {
                Path filePath = Paths.get(att.getFilePath());
                List<byte[]> images = documentConversionService.convertToImages(filePath, att.getFileType());
                for (int i = 0; i < images.size(); i++) {
                    Map<String, Object> imgMap = new HashMap<>();
                    imgMap.put("imageData", images.get(i));
                    imgMap.put("fileName", att.getFileName() + (images.size() > 1 ? " (Page " + (i + 1) + ")" : ""));
                    attachmentData.add(imgMap);
                }
            } catch (Exception e) {
                // Skip files that fail conversion — don't break the whole report
            }
        }

        if (!attachmentData.isEmpty()) {
            params.put("attachmentImages", new JRBeanCollectionDataSource(attachmentData));
        }

        // Compile subreport and add to params
        try (InputStream subIs = resourceLoader.getResource("classpath:reports/coa_attachments_subreport.jrxml").getInputStream()) {
            JasperReport subreport = JasperCompileManager.compileReport(subIs);
            params.put("ATTACHMENT_SUBREPORT", subreport);
        } catch (IOException e) {
            // Subreport is optional — COA still works without it
        }

        // Load template
        try (InputStream is = resourceLoader.getResource("classpath:reports/coa_template.jrxml").getInputStream()) {
            JasperReport jasperReport = JasperCompileManager.compileReport(is);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, dataSource);
            return JasperExportManager.exportReportToPdf(jasperPrint);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load COA template", e);
        }
    }

    // ==================== TRF Report ====================

    @Transactional(readOnly = true)
    public byte[] generateTrf(Long sampleId) throws JRException {
        Sample sample = sampleRepository.findById(sampleId)
                .orElseThrow(() -> new RuntimeException("Sample not found"));

        List<SampleTest> tests = sampleTestRepository.findBySampleIdOrderBySortOrderAscIdAsc(sampleId);

        // Map Header Parameters (22 Fields)
        Map<String, Object> params = new HashMap<>();
        Job job = sample.getJob();
        Client client = job.getClient();
        Project project = job.getProject();

        // Left Column
        params.put("requestNo", sample.getSampleNumber());
        params.put("client", client.getName());
        params.put("postBox", client.getAddress() != null ? client.getAddress() : "N/A");
        params.put("contactPerson", project != null && project.getContactPerson() != null ? project.getContactPerson() : (client.getContactPerson() != null ? client.getContactPerson() : "N/A"));
        params.put("projectNo", project != null ? project.getProjectNumber() : "N/A");
        params.put("projectName", project != null ? project.getName() : (job.getProjectName() != null ? job.getProjectName() : "N/A"));
        params.put("consultant", project != null && project.getConsultant() != null ? project.getConsultant() : "N/A");
        params.put("contractor", project != null && project.getContractor() != null ? project.getContractor() : "N/A");
        params.put("projectLocation", project != null && project.getLocation() != null ? project.getLocation() : "N/A");
        params.put("telephone", project != null && project.getPhone() != null ? project.getPhone() : (client.getPhone() != null ? client.getPhone() : "N/A"));
        params.put("email", project != null && project.getEmail() != null ? project.getEmail() : (client.getEmail() != null ? client.getEmail() : "N/A"));

        // Right Column
        params.put("sampleType", sample.getProduct().getName());
        params.put("sampleDescription", sample.getDescription() != null ? sample.getDescription() : "N/A");
        params.put("sampleId", sample.getSampleNumber());
        params.put("source", sample.getSamplingPoint() != null ? sample.getSamplingPoint() : "N/A");
        params.put("sampledBy", sample.getSampledBy() != null ? sample.getSampledBy() : "N/A");
        params.put("sampleFrom", sample.getSamplingPoint() != null ? sample.getSamplingPoint() : "N/A");
        params.put("sampleCertNo", "N/A"); // Not in DB
        params.put("deliveredBy", "N/A"); // Not in DB
        params.put("sampledDateTime", sample.getSampledAt() != null ? sample.getSampledAt().toString() : "N/A");
        params.put("dateReceived", sample.getReceivedAt() != null ? sample.getReceivedAt().toString() : "N/A");
        params.put("quotationNo", job.getPoNumber() != null ? job.getPoNumber() : "N/A");

        // Footer Signatures
        params.put("preparedBy", "Lab Registrar"); 
        params.put("checkedBy", "Technical Manager");
        params.put("approvedBy", "Lab Director");

        // Map Test List Data
        List<Map<String, Object>> testData = tests.stream().map(t -> {
            Map<String, Object> map = new HashMap<>();
            map.put("param", t.getTestMethod().getName());
            map.put("method", t.getTestMethod().getCode());
            map.put("qty", "1");
            return map;
        }).collect(Collectors.toList());

        JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(testData);

        // Load TRF template from requirements folder
        try (InputStream is = resourceLoader.getResource("file:d:/Workspace/LIMS/requirements/test.jrxml").getInputStream()) {
            JasperReport jasperReport = JasperCompileManager.compileReport(is);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, dataSource);
            return JasperExportManager.exportReportToPdf(jasperPrint);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load TRF template", e);
        }
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
