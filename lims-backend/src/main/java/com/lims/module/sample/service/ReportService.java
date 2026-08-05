package com.lims.module.sample.service;

import com.lims.module.sample.dto.OverdueSampleDTO;
import com.lims.module.sample.dto.TatReportDTO;
import com.lims.module.sample.dto.WorkloadReportDTO;
import com.lims.module.sample.entity.*;
import com.lims.module.sample.repository.SampleRepository;
import com.lims.module.sample.repository.SampleTestRepository;
import com.lims.module.sample.repository.SpecimenRepository;
import com.lims.module.sample.repository.CoaRevisionRepository;
import com.lims.module.sample.repository.TestResultRepository;
import com.lims.module.security.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final SpecimenRepository specimenRepository;
    private final CoaRevisionRepository coaRevisionRepository;
    private final TestResultRepository testResultRepository;
    private final UserRepository userRepository;

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

    @Transactional
    public byte[] generateCoa(Long sampleId) throws JRException {
        Sample sample = sampleRepository.findById(sampleId)
                .orElseThrow(() -> new RuntimeException("Sample not found"));

        long authorizedSpecimens = specimenRepository.countBySampleIdAndStatus(sampleId, "AUTHORIZED");
        long totalSpecimens = specimenRepository.countBySampleId(sampleId);
        
        List<SampleTest> tests = sampleTestRepository.findBySampleIdOrderBySortOrderAscIdAsc(sampleId);
        boolean hasAuthorizedTests = tests.stream().anyMatch(t -> "AUTHORIZED".equals(t.getStatus()) || "INTERIM_AUTHORIZED".equals(t.getStatus()));

        if (authorizedSpecimens == 0 && !hasAuthorizedTests && !"AUTHORIZED".equals(sample.getStatus())) {
            throw new IllegalStateException("CoA requires at least one authorized result");
        }

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
        
        // Specimen Interim parameters
        boolean isInterim = totalSpecimens > authorizedSpecimens;
        params.put("isInterim", isInterim);
        params.put("specimenSummary", authorizedSpecimens + " of " + totalSpecimens + " specimens tested");

        // Footer Signatures
        params.put("preparedBy", "Lab Registrar"); 
        params.put("checkedBy", "Technical Manager");
        params.put("approvedBy", "Lab Director");

        // Map tests to beans for Jasper
        List<Map<String, Object>> testData = new ArrayList<>();
        for (SampleTest t : tests) {
            boolean testHasSpecimens = false;
            if (t.getWorksheetData() != null) {
                Map<String, Object> schema = t.getWorksheetData().getMethodDefinition().getSchemaDefinition();
                if (schema != null && schema.get("sections") instanceof List) {
                    List<Map<String, Object>> sections = (List<Map<String, Object>>) schema.get("sections");
                    for (Map<String, Object> section : sections) {
                        if (Boolean.TRUE.equals(section.get("hasSpecimens"))) {
                            testHasSpecimens = true;
                            break;
                        }
                    }
                }
            }

            if (testHasSpecimens) {
                List<TestResult> results = testResultRepository.findBySampleTestIdOrderByEnteredAtDesc(t.getId())
                        .stream().filter(tr -> tr.getSpecimen() != null && "AUTHORIZED".equals(tr.getSpecimen().getStatus()))
                        .collect(Collectors.toList());
                
                for (TestResult tr : results) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("testName", t.getTestMethod().getName() + " — " + (tr.getSpecimen().getLabel() != null ? tr.getSpecimen().getLabel() : "Specimen " + tr.getSpecimen().getSpecimenNumber()));
                    map.put("methodName", t.getTestMethod().getCode());
                    map.put("result", tr.getDisplayValue());
                    map.put("units", "As Spec.");
                    map.put("limits", "As Spec.");
                    testData.add(map);
                }

                boolean hasCustomSummary = false;
                if (t.getWorksheetData() != null && t.getWorksheetData().getCalculatedResults() != null) {
                    WorksheetData wd = t.getWorksheetData();
                    Map<String, Object> schema = wd.getMethodDefinition().getSchemaDefinition();
                    Map<String, Object> calcResults = wd.getCalculatedResults();
                    if (schema != null && schema.get("sections") instanceof List) {
                        List<Map<String, Object>> sections = (List<Map<String, Object>>) schema.get("sections");
                        List<Map<String, Object>> customFields = new ArrayList<>();
                        for (Map<String, Object> section : sections) {
                            String sectionId = (String) section.get("id");
                            String sectionType = (String) section.get("type");
                            if ("SINGLE_VALUE".equals(sectionType) && section.get("fields") instanceof List) {
                                List<Map<String, Object>> fields = (List<Map<String, Object>>) section.get("fields");
                                for (Map<String, Object> field : fields) {
                                    if (Boolean.TRUE.equals(field.get("isFinalResult"))) {
                                        customFields.add(field);
                                    }
                                }
                            }
                        }
                        
                        if (!customFields.isEmpty()) {
                            List<Map<String, Object>> resolvedSummaries = new ArrayList<>();
                            for (Map<String, Object> field : customFields) {
                                String fieldId = (String) field.get("id");
                                String sectionId = null;
                                for (Map<String, Object> section : sections) {
                                    if ("SINGLE_VALUE".equals(section.get("type")) && section.get("fields") instanceof List) {
                                        List<Map<String, Object>> fields = (List<Map<String, Object>>) section.get("fields");
                                        for (Map<String, Object> f : fields) {
                                            if (fieldId.equals(f.get("id"))) {
                                                sectionId = (String) section.get("id");
                                                break;
                                            }
                                        }
                                    }
                                    if (sectionId != null) break;
                                }
                                
                                if (sectionId != null && calcResults.get(sectionId) instanceof Map) {
                                    Map<String, Object> sectionVals = (Map<String, Object>) calcResults.get(sectionId);
                                    Object val = sectionVals.get(fieldId);
                                    if (val != null && !val.toString().trim().isEmpty() && !"null".equals(val.toString())) {
                                        Map<String, Object> summaryMap = new HashMap<>();
                                        summaryMap.put("label", field.get("label"));
                                        summaryMap.put("unit", field.get("unit"));
                                        summaryMap.put("value", val.toString());
                                        resolvedSummaries.add(summaryMap);
                                    }
                                }
                            }
                            
                            if (!resolvedSummaries.isEmpty()) {
                                hasCustomSummary = true;
                                for (Map<String, Object> summary : resolvedSummaries) {
                                    Map<String, Object> map = new HashMap<>();
                                    map.put("testName", t.getTestMethod().getName() + " — " + summary.get("label"));
                                    map.put("methodName", t.getTestMethod().getCode());
                                    map.put("result", summary.get("value"));
                                    map.put("units", summary.get("unit") != null ? summary.get("unit") : "As Spec.");
                                    map.put("limits", "As Spec.");
                                    testData.add(map);
                                }
                            }
                        }
                    }
                }

                if (!hasCustomSummary && results.size() > 1) {
                    double sum = 0;
                    int count = 0;
                    for (TestResult tr : results) {
                        if (tr.getNumericValue() != null) {
                            sum += tr.getNumericValue().doubleValue();
                            count++;
                        }
                    }
                    if (count > 0) {
                        double avg = sum / count;
                        Map<String, Object> map = new HashMap<>();
                        map.put("testName", t.getTestMethod().getName() + " — AVERAGE");
                        map.put("methodName", t.getTestMethod().getCode());
                        map.put("result", String.format("%.2f", avg));
                        map.put("units", "As Spec.");
                        map.put("limits", "As Spec.");
                        testData.add(map);
                    }
                }
            } else {
                Map<String, Object> map = new HashMap<>();
                map.put("testName", t.getTestMethod().getName());
                map.put("methodName", t.getTestMethod().getCode());
                map.put("result", t.getLastResult() != null ? t.getLastResult().getDisplayValue() : "N/A");
                map.put("units", "As Spec.");
                map.put("limits", "As Spec.");
                testData.add(map);
            }
        }

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
                // Skip files that fail conversion
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
            // Subreport is optional
        }

        byte[] pdfBytes;
        // Load template
        try (InputStream is = resourceLoader.getResource("classpath:reports/coa_template.jrxml").getInputStream()) {
            JasperReport jasperReport = JasperCompileManager.compileReport(is);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, dataSource);
            pdfBytes = JasperExportManager.exportReportToPdf(jasperPrint);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load COA template", e);
        }

        // Save a snapshot of this CoA revision
        try {
            int nextRev = coaRevisionRepository.countBySampleId(sampleId);
            String username = "System";
            try {
                var auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.getName() != null) {
                    username = auth.getName();
                }
            } catch (Exception ignored) {}
            
            com.lims.module.security.entity.User currentUser = userRepository.findByUsername(username).orElse(null);

            CoaRevision revision = CoaRevision.builder()
                    .sample(sample)
                    .revisionNumber(nextRev)
                    .isInterim(isInterim)
                    .specimensIncluded((int) authorizedSpecimens)
                    .specimensTotal((int) totalSpecimens)
                    .pdfSnapshot(pdfBytes)
                    .generatedBy(currentUser)
                    .generatedAt(Instant.now())
                    .build();
            coaRevisionRepository.save(revision);
        } catch (Exception e) {
            // Log and ignore to prevent blocking PDF download if audit saving fails
        }

        return pdfBytes;
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
