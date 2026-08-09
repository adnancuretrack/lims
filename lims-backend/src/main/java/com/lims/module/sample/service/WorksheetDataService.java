package com.lims.module.sample.service;

import com.lims.module.sample.dto.WorksheetSubmitRequest;
import com.lims.module.sample.dto.SpecimenSubmitRequest;
import com.lims.module.sample.dto.SpecimenDTO;
import com.lims.module.sample.entity.*;
import com.lims.module.sample.repository.SampleRepository;
import com.lims.module.sample.repository.SampleTestRepository;
import com.lims.module.sample.repository.TestResultRepository;
import com.lims.module.sample.repository.WorksheetDataRepository;
import com.lims.module.sample.repository.SpecimenRepository;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.UserRepository;
import com.lims.module.notification.service.DataSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorksheetDataService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.systemDefault());

    private final WorksheetDataRepository worksheetDataRepository;
    private final SampleTestRepository sampleTestRepository;
    private final TestResultRepository testResultRepository;
    private final SampleRepository sampleRepository;
    private final UserRepository userRepository;
    private final DataSyncService dataSyncService;
    private final MethodDefinitionService methodDefinitionService;
    private final SpecimenRepository specimenRepository;

    @Transactional
    public Map<String, Object> getWorksheet(Long sampleTestId) {
        SampleTest st = sampleTestRepository.findById(sampleTestId)
                .orElseThrow(() -> new RuntimeException("Sample test not found"));

        var activeDef = methodDefinitionService.getActiveDefinitionEntity(st.getTestMethod().getId());
        if (activeDef == null) {
            throw new RuntimeException("No active worksheet definition found for this test method");
        }

        WorksheetData wd = worksheetDataRepository.findBySampleTestId(sampleTestId)
                .orElseGet(() -> {
                    // Create if not exists - dynamic lazy initialization
                    WorksheetData newWd = new WorksheetData();
                    newWd.setSampleTest(st);
                    newWd.setMethodDefinition(activeDef);
                    newWd.setStatus("DRAFT");
                    
                    // Pre-fill from system mapping
                    Map<String, Object> initialData = prefillSystemMappedData(st, activeDef);
                    newWd.setData(initialData);
                    
                    return worksheetDataRepository.save(newWd);
                });
        
        List<SpecimenDTO> specimenStatuses = specimenRepository.findBySampleIdOrderBySpecimenNumberAsc(st.getSample().getId())
                .stream().map(sp -> {
                    Long trId = testResultRepository.findBySampleTestIdAndSpecimenId(sampleTestId, sp.getId())
                            .map(TestResult::getId).orElse(null);
                    return SpecimenDTO.builder()
                        .id(sp.getId())
                        .sampleId(sp.getSample().getId())
                        .specimenNumber(sp.getSpecimenNumber())
                        .label(sp.getLabel())
                        .scheduledTestDate(sp.getScheduledTestDate())
                        .status(sp.getStatus())
                        .testedBy(sp.getTestedBy() != null ? sp.getTestedBy().getDisplayName() : null)
                        .testedAt(sp.getTestedAt())
                        .authorizedBy(sp.getAuthorizedBy() != null ? sp.getAuthorizedBy().getDisplayName() : null)
                        .authorizedAt(sp.getAuthorizedAt())
                        .testResultId(trId)
                        .build();
                })
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("schema", wd.getMethodDefinition().getSchemaDefinition());
        response.put("data", wd.getData() != null ? wd.getData() : Map.of());
        response.put("status", wd.getStatus());
        response.put("context", buildContextData(st));
        response.put("specimenStatuses", specimenStatuses);
        return response;
    }

    @Transactional
    public void submitWorksheet(Long sampleTestId, WorksheetSubmitRequest request) {
        WorksheetData wd = worksheetDataRepository.findBySampleTestId(sampleTestId)
                .orElseThrow(() -> new RuntimeException("Worksheet data not found"));

        SampleTest st = wd.getSampleTest();
        validateLockStatus(st, wd.getMethodDefinition().getSchemaDefinition(), request.getData(), wd.getData());

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 1. Update WorksheetData
        wd.setData(request.getData());
        wd.setCalculatedResults(request.getCalculatedResults());
        wd.setStatus("SUBMITTED");
        wd.setSubmittedBy(currentUser);
        wd.setSubmittedAt(Instant.now());
        worksheetDataRepository.save(wd);

        // 2. The Bridge: Update TestResult
        TestResult result = st.getResults().isEmpty() ? new TestResult() : st.getResults().get(0);
        result.setSampleTest(st);
        result.setEnteredBy(currentUser);
        result.setEnteredAt(Instant.now());



        testResultRepository.save(result);

        // 3. Update SampleTest status
        st.setStatus("UNDER_REVIEW");
        sampleTestRepository.save(st);

        // 4. Update Sample status
        updateSampleStatusIfFinished(st.getSample());

        // Broadcast event
        dataSyncService.broadcast("SAMPLE", st.getSample().getId(), "WORKSHEET_SUBMITTED");
    }

    @Transactional
    public void submitInterim(Long sampleTestId, SpecimenSubmitRequest request) {
        submitSpecimensInternal(sampleTestId, request, false);
    }

    @Transactional
    public void submitFinal(Long sampleTestId, SpecimenSubmitRequest request) {
        submitSpecimensInternal(sampleTestId, request, true);
    }

    private void submitSpecimensInternal(Long sampleTestId, SpecimenSubmitRequest request, boolean isFinal) {
        WorksheetData wd = worksheetDataRepository.findBySampleTestId(sampleTestId)
                .orElseGet(() -> {
                    SampleTest st = sampleTestRepository.findById(sampleTestId)
                            .orElseThrow(() -> new RuntimeException("Sample test not found"));
                    var activeDef = methodDefinitionService.getActiveDefinitionEntity(st.getTestMethod().getId());
                    if (activeDef == null) {
                        throw new RuntimeException("No active worksheet definition found for this test method");
                    }
                    WorksheetData newWd = new WorksheetData();
                    newWd.setSampleTest(st);
                    newWd.setMethodDefinition(activeDef);
                    newWd.setStatus("DRAFT");
                    newWd.setData(new HashMap<>());
                    return worksheetDataRepository.save(newWd);
                });

        SampleTest st = wd.getSampleTest();
        validateLockStatus(st, wd.getMethodDefinition().getSchemaDefinition(), request.getData(), wd.getData());

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 1. Update WorksheetData data
        Map<String, Object> data = request.getData() != null ? new HashMap<>(request.getData()) : new HashMap<>();
        applyLateBindingSystemMappings(wd.getMethodDefinition().getSchemaDefinition(), data, currentUser, false);
        wd.setData(data);
        wd.setCalculatedResults(request.getCalculatedResults());
        wd.setStatus(isFinal ? "SUBMITTED_FINAL" : "SUBMITTED");
        wd.setSubmittedBy(currentUser);
        wd.setSubmittedAt(Instant.now());
        wd.setInterimSubmission(!isFinal);
        wd.setSubmissionCount(wd.getSubmissionCount() + 1);
        worksheetDataRepository.save(wd);

        Sample sample = st.getSample();

        // 2. Process each finalized specimen index
        for (Integer index : request.getSpecimenIndices()) {
            Integer specimenNumber = index + 1;
            Specimen specimen = specimenRepository.findBySampleIdAndSpecimenNumber(sample.getId(), specimenNumber)
                    .orElseGet(() -> Specimen.builder()
                            .sample(sample)
                            .specimenNumber(specimenNumber)
                            .build());

            specimen.setStatus("TESTED");
            specimen.setTestedBy(currentUser);
            specimen.setTestedAt(Instant.now());
            Specimen savedSpecimen = specimenRepository.save(specimen);

            // 3. Create or update TestResult for this specimen
            TestResult result = testResultRepository.findBySampleTestIdAndSpecimenId(sampleTestId, savedSpecimen.getId())
                    .orElseGet(() -> TestResult.builder()
                            .sampleTest(st)
                            .specimen(savedSpecimen)
                            .build());

            result.setEnteredBy(currentUser);
            result.setEnteredAt(Instant.now());



            testResultRepository.save(result);
        }

        // 4. Update SampleTest status
        st.setStatus("UNDER_REVIEW");
        sampleTestRepository.save(st);

        // 5. Update Sample status
        updateSampleStatusIfFinished(sample);

        dataSyncService.broadcast("SAMPLE", sample.getId(), "SPECIMENS_SUBMITTED");
    }

    @Transactional
    public void saveDraft(Long sampleTestId, Map<String, Object> data) {
        WorksheetData wd = worksheetDataRepository.findBySampleTestId(sampleTestId)
                .orElseThrow(() -> new RuntimeException("Worksheet data not found"));
        SampleTest st = wd.getSampleTest();
        validateLockStatus(st, wd.getMethodDefinition().getSchemaDefinition(), data, wd.getData());
        wd.setData(data);
        worksheetDataRepository.save(wd);
    }

    private void validateLockStatus(SampleTest st, Map<String, Object> schema, Map<String, Object> newData, Map<String, Object> oldData) {
        String testStatus = st.getStatus();
        if ("AUTHORIZED".equals(testStatus)) {
            throw new RuntimeException("Cannot edit authorized worksheet");
        }
        if ("COMPLETED".equals(testStatus)) {
            throw new RuntimeException("Cannot edit worksheet under review");
        }
        if ("INTERIM_AUTHORIZED".equals(testStatus)) {
            verifyAuthorizedDataNotModified(st.getSample().getId(), schema, oldData, newData);
        }
    }

    @SuppressWarnings("unchecked")
    private void verifyAuthorizedDataNotModified(Long sampleId, Map<String, Object> schema, Map<String, Object> oldData, Map<String, Object> newData) {
        if (schema == null || oldData == null || newData == null) return;
        List<Map<String, Object>> sections = (List<Map<String, Object>>) schema.get("sections");
        if (sections == null) return;

        for (Map<String, Object> section : sections) {
            if (Boolean.TRUE.equals(section.get("hasSpecimens"))) {
                String sectionId = (String) section.get("id");
                Object oldSectionVal = oldData.get(sectionId);
                Object newSectionVal = newData.get(sectionId);

                if (!(oldSectionVal instanceof List) || !(newSectionVal instanceof List)) {
                    continue;
                }

                List<Map<String, Object>> oldList = (List<Map<String, Object>>) oldSectionVal;
                List<Map<String, Object>> newList = (List<Map<String, Object>>) newSectionVal;

                List<Specimen> specimens = specimenRepository.findBySampleIdOrderBySpecimenNumberAsc(sampleId);
                for (Specimen spec : specimens) {
                    if ("AUTHORIZED".equals(spec.getStatus())) {
                        int idx = spec.getSpecimenNumber() - 1;
                        if (idx >= newList.size()) {
                            throw new RuntimeException("Cannot delete authorized specimen column: " + spec.getSpecimenNumber());
                        }
                        Map<String, Object> oldSpecData = idx < oldList.size() ? oldList.get(idx) : Map.of();
                        Map<String, Object> newSpecData = newList.get(idx);
                        if (!oldSpecData.equals(newSpecData)) {
                            throw new RuntimeException("Cannot modify authorized specimen data for specimen: " + spec.getSpecimenNumber());
                        }
                    }
                }
            }
        }
    }

    private void updateSampleStatusIfFinished(Sample sample) {
        List<SampleTest> tests = sampleTestRepository.findBySampleIdOrderBySortOrderAscIdAsc(sample.getId());
        boolean allFinished = tests.stream().allMatch(t -> "COMPLETED".equals(t.getStatus()) || "AUTHORIZED".equals(t.getStatus()));
        boolean anyUnderReview = tests.stream().anyMatch(t -> "UNDER_REVIEW".equals(t.getStatus()));
        if (allFinished) {
            sample.setStatus("COMPLETED");
        } else if (anyUnderReview) {
            sample.setStatus("UNDER_REVIEW");
        } else {
            sample.setStatus("IN_PROGRESS");
        }
        sampleRepository.save(sample);
    }

    private Map<String, Object> prefillSystemMappedData(SampleTest st, MethodDefinition activeDef) {
        Map<String, Object> data = new HashMap<>();
        Map<String, Object> schema = activeDef.getSchemaDefinition();
        if (schema != null && schema.get("sections") instanceof List) {
            List<Map<String, Object>> sections = (List<Map<String, Object>>) schema.get("sections");
            for (Map<String, Object> section : sections) {
                String sectionId = (String) section.get("id");
                Map<String, Object> sectionData = new HashMap<>();
                
                // Scan fields for SINGLE_VALUE
                if (section.get("fields") instanceof List) {
                    List<Map<String, Object>> fields = (List<Map<String, Object>>) section.get("fields");
                    for (Map<String, Object> field : fields) {
                        String mapping = (String) field.get("systemMapping");
                        if (mapping != null && !mapping.isEmpty()) {
                            Object value = resolveSystemValue(st, mapping);
                            if (value != null) {
                                sectionData.put((String) field.get("id"), value);
                            }
                        }
                    }
                }
                
                // Scan columns for DATA_TABLE or GROUPED_TABLE (Only for trial/row defaults in future? 
                // For now, mapping usually applies to SINGLE_VALUE fields)
                // But let's handle it for consistency if they map a field in a single-row table.

                // Scan cellMappings for MATRIX_TABLE
                if (section.get("cellMappings") instanceof Map) {
                    Map<String, String> cellMappings = (Map<String, String>) section.get("cellMappings");
                    for (Map.Entry<String, String> entry : cellMappings.entrySet()) {
                        String cellKey = entry.getKey();
                        String mapping = entry.getValue();
                        if (mapping != null && !mapping.isEmpty()) {
                            String[] parts = parseCellKey(cellKey, section);
                            if (parts != null && parts.length == 2) {
                                Object value = resolveSystemValue(st, mapping);
                                if (value != null) {
                                    String rowId = parts[0];
                                    String colId = parts[1];
                                    Map<String, Object> rowData = (Map<String, Object>) sectionData.computeIfAbsent(rowId, k -> new HashMap<>());
                                    rowData.put(colId, value);
                                }
                            }
                        }
                    }
                }

                if (!sectionData.isEmpty()) {
                    data.put(sectionId, sectionData);
                }
            }
        }
        return data;
    }

    @SuppressWarnings("unchecked")
    private String[] parseCellKey(String cellKey, Map<String, Object> section) {
        if (cellKey == null || !cellKey.contains("_")) return null;

        if (section != null && section.get("rowHeaders") instanceof List) {
            List<Map<String, Object>> rowHeaders = (List<Map<String, Object>>) section.get("rowHeaders");
            for (Map<String, Object> rh : rowHeaders) {
                String rId = (String) rh.get("id");
                if (rId != null && cellKey.startsWith(rId + "_")) {
                    String colId = cellKey.substring(rId.length() + 1);
                    return new String[]{ rId, colId };
                }
            }
        }
        return cellKey.split("_", 2);
    }

    private Object resolveSystemValue(SampleTest st, String mapping) {
        Sample s = st.getSample();
        Job j = s.getJob();
        
        switch (mapping) {
            case "sample.sampleNumber": return s.getSampleNumber();
            case "sample.job.jobNumber": return j != null ? j.getJobNumber() : null;
            case "sample.job.client.name": return (j != null && j.getClient() != null) ? j.getClient().getName() : null;
            case "sample.product.name": return s.getProduct() != null ? s.getProduct().getName() : null;
            case "sample.job.projectName": return j != null ? j.getProjectName() : null;
            case "sample.job.poNumber": return j != null ? j.getPoNumber() : null;
            case "sample.sampledAt": return s.getSampledAt() != null ? DATE_TIME_FORMATTER.format(s.getSampledAt()) : null;
            case "sample.receivedAt": return s.getReceivedAt() != null ? DATE_TIME_FORMATTER.format(s.getReceivedAt()) : null;
            default: return null;
        }
    }

    private Map<String, Object> buildContextData(SampleTest st) {
        Map<String, Object> ctx = new HashMap<>();
        Sample s = st.getSample();
        Job j = s.getJob();
        
        ctx.put("sample.sampleNumber", s.getSampleNumber());
        ctx.put("sample.product.name", s.getProduct() != null ? s.getProduct().getName() : null);
        ctx.put("sample.receivedAt", s.getReceivedAt() != null ? DATE_TIME_FORMATTER.format(s.getReceivedAt()) : null);
        ctx.put("sample.sampledAt", s.getSampledAt() != null ? DATE_TIME_FORMATTER.format(s.getSampledAt()) : null);
        
        if (j != null) {
            ctx.put("sample.job.jobNumber", j.getJobNumber());
            ctx.put("sample.job.projectName", j.getProjectName());
            ctx.put("sample.job.poNumber", j.getPoNumber());
            if (j.getClient() != null) {
                ctx.put("sample.job.client.name", j.getClient().getName());
            }
        }
        
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        ctx.put("currentUser.name", username);
        
        return ctx;
    }

    @SuppressWarnings("unchecked")
    private void applyLateBindingSystemMappings(Map<String, Object> schema, Map<String, Object> data, User currentUser, boolean isAuthorizationPass) {
        if (schema == null || !(schema.get("sections") instanceof List) || data == null) {
            return;
        }
        List<Map<String, Object>> sections = (List<Map<String, Object>>) schema.get("sections");
        Instant now = Instant.now();
        String formattedNow = DATE_TIME_FORMATTER.format(now);

        for (Map<String, Object> section : sections) {
            String sectionId = (String) section.get("id");
            if (sectionId == null) continue;

            Object rawSecData = data.get(sectionId);
            Map<String, Object> sectionData = (rawSecData instanceof Map) ? (Map<String, Object>) rawSecData : null;

            if (section.get("fields") instanceof List) {
                List<Map<String, Object>> fields = (List<Map<String, Object>>) section.get("fields");
                for (Map<String, Object> field : fields) {
                    String mapping = (String) field.get("systemMapping");
                    if (mapping == null || mapping.isEmpty()) continue;

                    String fieldId = (String) field.get("id");
                    if (fieldId == null) continue;

                    if (sectionData == null) {
                        sectionData = new HashMap<>();
                        data.put(sectionId, sectionData);
                    }

                    if (!isAuthorizationPass) {
                        // Tester submission scope
                        switch (mapping) {
                            case "audit.testedBy.displayName":
                                sectionData.put(fieldId, currentUser.getDisplayName());
                                break;
                            case "audit.testedBy.username":
                                sectionData.put(fieldId, currentUser.getUsername());
                                break;
                            case "audit.testedAt.datetime":
                                sectionData.put(fieldId, formattedNow);
                                break;
                            case "audit.testedBy.signature":
                                String sig = currentUser.getSignatureImagePath();
                                sectionData.put(fieldId, sig != null ? sig : "Signed by " + currentUser.getDisplayName());
                                break;
                            default:
                                break;
                        }
                    } else {
                        // Authorizer scope
                        switch (mapping) {
                            case "audit.authorizedBy.displayName":
                                sectionData.put(fieldId, currentUser.getDisplayName());
                                break;
                            case "audit.authorizedBy.username":
                                sectionData.put(fieldId, currentUser.getUsername());
                                break;
                            case "audit.authorizedAt.datetime":
                                sectionData.put(fieldId, formattedNow);
                                break;
                            case "audit.authorizedBy.signature":
                                String sig = currentUser.getSignatureImagePath();
                                sectionData.put(fieldId, sig != null ? sig : "Signed by " + currentUser.getDisplayName());
                                break;
                            default:
                                break;
                        }
                    }
                }
            }

            if (section.get("cellMappings") instanceof Map) {
                Map<String, String> cellMappings = (Map<String, String>) section.get("cellMappings");
                for (Map.Entry<String, String> entry : cellMappings.entrySet()) {
                    String cellKey = entry.getKey();
                    String mapping = entry.getValue();
                    if (mapping == null || mapping.isEmpty()) continue;

                    String[] parts = parseCellKey(cellKey, section);
                    if (parts == null || parts.length != 2) continue;

                    String rowId = parts[0];
                    String colId = parts[1];

                    if (sectionData == null) {
                        sectionData = new HashMap<>();
                        data.put(sectionId, sectionData);
                    }

                    Object rawRowData = sectionData.get(rowId);
                    Map<String, Object> rowData = (rawRowData instanceof Map)
                            ? (Map<String, Object>) rawRowData
                            : new HashMap<>();
                    sectionData.put(rowId, rowData);

                    if (!isAuthorizationPass) {
                        // Tester submission scope
                        switch (mapping) {
                            case "audit.testedBy.displayName":
                                rowData.put(colId, currentUser.getDisplayName());
                                break;
                            case "audit.testedBy.username":
                                rowData.put(colId, currentUser.getUsername());
                                break;
                            case "audit.testedAt.datetime":
                                rowData.put(colId, formattedNow);
                                break;
                            case "audit.testedBy.signature":
                                String sig = currentUser.getSignatureImagePath();
                                rowData.put(colId, sig != null ? sig : "Signed by " + currentUser.getDisplayName());
                                break;
                            default:
                                break;
                        }
                    } else {
                        // Authorizer scope
                        switch (mapping) {
                            case "audit.authorizedBy.displayName":
                                rowData.put(colId, currentUser.getDisplayName());
                                break;
                            case "audit.authorizedBy.username":
                                rowData.put(colId, currentUser.getUsername());
                                break;
                            case "audit.authorizedAt.datetime":
                                rowData.put(colId, formattedNow);
                                break;
                            case "audit.authorizedBy.signature":
                                String sig = currentUser.getSignatureImagePath();
                                rowData.put(colId, sig != null ? sig : "Signed by " + currentUser.getDisplayName());
                                break;
                            default:
                                break;
                        }
                    }
                }
            }
        }
    }

    @Transactional
    public void applyAuthorizationMappings(WorksheetData wd, User currentUser) {
        if (wd == null || wd.getMethodDefinition() == null) return;
        Map<String, Object> data = wd.getData() != null ? new HashMap<>(wd.getData()) : new HashMap<>();
        applyLateBindingSystemMappings(wd.getMethodDefinition().getSchemaDefinition(), data, currentUser, true);
        wd.setData(data);
        worksheetDataRepository.save(wd);
    }

    @Transactional
    public void finalizeWorksheet(Long sampleTestId) {
        WorksheetData wd = worksheetDataRepository.findBySampleTestId(sampleTestId)
                .orElseThrow(() -> new RuntimeException("Worksheet data not found"));
        SampleTest st = wd.getSampleTest();
        
        if (!"UNDER_REVIEW".equals(st.getStatus())) {
            throw new RuntimeException("Sample test is not in UNDER_REVIEW status");
        }

        List<TestResult> results = testResultRepository.findBySampleTestIdOrderByEnteredAtDesc(sampleTestId);
        for (TestResult result : results) {
            Specimen specimen = result.getSpecimen();
            if (specimen != null && "TESTED".equals(specimen.getStatus())) {
                specimen.setStatus("FINALIZED");
                specimenRepository.save(specimen);
            }
        }

        st.setStatus("COMPLETED");
        if (wd.getStatus() != null && wd.getStatus().startsWith("SUBMITTED")) {
            wd.setStatus("COMPLETED");
        }
        worksheetDataRepository.save(wd);
        sampleTestRepository.save(st);
        
        updateSampleStatusIfFinished(st.getSample());
        dataSyncService.broadcast("SAMPLE", st.getSample().getId(), "WORKSHEET_FINALIZED");
    }

    @Transactional
    public void rejectReview(Long sampleTestId) {
        WorksheetData wd = worksheetDataRepository.findBySampleTestId(sampleTestId)
                .orElseThrow(() -> new RuntimeException("Worksheet data not found"));
        SampleTest st = wd.getSampleTest();
        
        if (!"UNDER_REVIEW".equals(st.getStatus())) {
            throw new RuntimeException("Sample test is not in UNDER_REVIEW status");
        }

        List<TestResult> results = testResultRepository.findBySampleTestIdOrderByEnteredAtDesc(sampleTestId);
        for (TestResult result : results) {
            Specimen specimen = result.getSpecimen();
            if (specimen != null && "TESTED".equals(specimen.getStatus())) {
                specimen.setStatus("DRAFT");
                specimenRepository.save(specimen);
            }
        }

        st.setStatus("IN_PROGRESS");
        wd.setStatus("DRAFT");
        
        worksheetDataRepository.save(wd);
        sampleTestRepository.save(st);
        
        updateSampleStatusIfFinished(st.getSample());
        dataSyncService.broadcast("SAMPLE", st.getSample().getId(), "WORKSHEET_REJECTED");
    }
}
