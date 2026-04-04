package com.lims.module.sample.service;

import com.lims.module.sample.dto.WorksheetSubmitRequest;
import com.lims.module.sample.entity.*;
import com.lims.module.sample.repository.SampleRepository;
import com.lims.module.sample.repository.SampleTestRepository;
import com.lims.module.sample.repository.TestResultRepository;
import com.lims.module.sample.repository.WorksheetDataRepository;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.UserRepository;
import com.lims.module.notification.service.DataSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorksheetDataService {

    private final WorksheetDataRepository worksheetDataRepository;
    private final SampleTestRepository sampleTestRepository;
    private final TestResultRepository testResultRepository;
    private final SampleRepository sampleRepository;
    private final UserRepository userRepository;
    private final DataSyncService dataSyncService;
    private final MethodDefinitionService methodDefinitionService;

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
                    Map<String, Object> initialData = new HashMap<>();
                    Map<String, Object> headerData = prefillHeaderData(st, activeDef);
                    if (!headerData.isEmpty()) {
                        initialData.put("header", headerData);
                    }
                    newWd.setData(initialData);
                    
                    return worksheetDataRepository.save(newWd);
                });
        
        return Map.of(
            "schema", activeDef.getSchemaDefinition(),
            "data", wd.getData() != null ? wd.getData() : Map.of(),
            "status", wd.getStatus()
        );
    }

    @Transactional
    public void submitWorksheet(Long sampleTestId, WorksheetSubmitRequest request) {
        WorksheetData wd = worksheetDataRepository.findBySampleTestId(sampleTestId)
                .orElseThrow(() -> new RuntimeException("Worksheet data not found"));

        if ("AUTHORIZED".equals(wd.getSampleTest().getStatus())) {
            throw new RuntimeException("Cannot edit authorized worksheet");
        }

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
        SampleTest st = wd.getSampleTest();
        TestResult result = st.getResults().isEmpty() ? new TestResult() : st.getResults().get(0);
        result.setSampleTest(st);
        result.setEnteredBy(currentUser);
        result.setEnteredAt(Instant.now());

        // Extract final results from the map
        if (request.getFinalResults() != null && !request.getFinalResults().isEmpty()) {
            if (request.getFinalResults().size() == 1) {
                Map.Entry<String, Object> entry = request.getFinalResults().entrySet().iterator().next();
                Map<String, Object> valMap = (Map<String, Object>) entry.getValue();
                Object val = valMap.get("value");
                
                if (val instanceof Number) {
                    result.setNumericValue(new BigDecimal(val.toString()));
                } else if (val != null) {
                    result.setTextValue(val.toString());
                }
            } else {
                // Concatenate multiple results
                String combined = request.getFinalResults().values().stream()
                    .map(obj -> {
                        Map<String, Object> m = (Map<String, Object>) obj;
                        return m.get("label") + ": " + m.get("value") + (m.get("unit") != null ? " " + m.get("unit") : "");
                    })
                    .collect(Collectors.joining(", "));
                result.setTextValue(combined);
                
                // Use first numeric value as numericValue
                request.getFinalResults().values().stream()
                    .map(obj -> ((Map<String, Object>) obj).get("value"))
                    .filter(v -> v instanceof Number)
                    .findFirst()
                    .ifPresent(v -> result.setNumericValue(new BigDecimal(v.toString())));
            }
        }

        // Flag OOS for Quantitative
        if (result.getNumericValue() != null && st.getTestMethod().getMinLimit() != null && st.getTestMethod().getMaxLimit() != null) {
            BigDecimal val = result.getNumericValue();
            BigDecimal min = st.getTestMethod().getMinLimit();
            BigDecimal max = st.getTestMethod().getMaxLimit();
            boolean oos = val.compareTo(min) < 0 || val.compareTo(max) > 0;
            result.setOutOfRange(oos);
            result.setFlagColor(oos ? "RED" : "GREEN");
        } else {
            result.setOutOfRange(false);
            result.setFlagColor("GREEN");
        }

        testResultRepository.save(result);

        // 3. Update SampleTest status
        st.setStatus("COMPLETED");
        sampleTestRepository.save(st);

        // 4. Update Sample status
        updateSampleStatusIfFinished(st.getSample());

        // Broadcast event
        dataSyncService.broadcast("SAMPLE", st.getSample().getId(), "WORKSHEET_SUBMITTED");
    }

    @Transactional
    public void saveDraft(Long sampleTestId, Map<String, Object> data) {
        WorksheetData wd = worksheetDataRepository.findBySampleTestId(sampleTestId)
                .orElseThrow(() -> new RuntimeException("Worksheet data not found"));
        wd.setData(data);
        worksheetDataRepository.save(wd);
    }

    private void updateSampleStatusIfFinished(Sample sample) {
        List<SampleTest> tests = sampleTestRepository.findBySampleIdOrderBySortOrderAscIdAsc(sample.getId());
        boolean allFinished = tests.stream().allMatch(t -> "COMPLETED".equals(t.getStatus()) || "AUTHORIZED".equals(t.getStatus()));
        if (allFinished) {
            sample.setStatus("COMPLETED");
            sampleRepository.save(sample);
        } else {
            sample.setStatus("IN_PROGRESS");
            sampleRepository.save(sample);
        }
    }

    private Map<String, Object> prefillHeaderData(SampleTest st, MethodDefinition activeDef) {
        Map<String, Object> headerData = new HashMap<>();
        Map<String, Object> schema = activeDef.getSchemaDefinition();
        if (schema != null && schema.get("headerFields") instanceof List) {
            List<Map<String, Object>> headerFields = (List<Map<String, Object>>) schema.get("headerFields");
            for (Map<String, Object> field : headerFields) {
                String mapping = (String) field.get("systemMapping");
                if (mapping != null && !mapping.isEmpty()) {
                    Object value = resolveSystemValue(st, mapping);
                    if (value != null) {
                        headerData.put((String) field.get("id"), value);
                    }
                }
            }
        }
        return headerData;
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
            case "sample.sampledAt": return s.getSampledAt();
            case "sample.receivedAt": return s.getReceivedAt();
            default: return null;
        }
    }
}
