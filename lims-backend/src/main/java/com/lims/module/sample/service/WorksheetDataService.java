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
        wd.setData(request.getData());
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

            specimen.setStatus("FINALIZED");
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

            if (request.getFinalResults() != null) {
                StringBuilder combinedText = new StringBuilder();
                BigDecimal firstNumeric = null;
                for (Map.Entry<String, Object> entry : request.getFinalResults().entrySet()) {
                    Map<String, Object> valMap = (Map<String, Object>) entry.getValue();
                    Object valObj = valMap.get("value");
                    if (valObj instanceof List) {
                        List<?> vals = (List<?>) valObj;
                        if (index < vals.size()) {
                            Object val = vals.get(index);
                            if (val != null) {
                                String label = (String) valMap.get("label");
                                String unit = (String) valMap.get("unit");
                                if (combinedText.length() > 0) {
                                    combinedText.append(", ");
                                }
                                combinedText.append(label).append(": ").append(val).append(unit != null ? " " + unit : "");
                                
                                if (val instanceof Number && firstNumeric == null) {
                                    firstNumeric = new BigDecimal(val.toString());
                                } else if (firstNumeric == null) {
                                    try {
                                        firstNumeric = new BigDecimal(val.toString());
                                    } catch (NumberFormatException ignored) {}
                                }
                            }
                        }
                    } else if (valObj != null) {
                        if (combinedText.length() > 0) {
                            combinedText.append(", ");
                        }
                        combinedText.append(valMap.get("label")).append(": ").append(valObj).append(valMap.get("unit") != null ? " " + valMap.get("unit") : "");
                        if (valObj instanceof Number && firstNumeric == null) {
                            firstNumeric = new BigDecimal(valObj.toString());
                        }
                    }
                }
                if (combinedText.length() > 0) {
                    result.setTextValue(combinedText.toString());
                }
                if (firstNumeric != null) {
                    result.setNumericValue(firstNumeric);
                }
            }

            testResultRepository.save(result);
        }

        // 4. Update SampleTest status
        st.setStatus("COMPLETED");
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
        if (allFinished) {
            sample.setStatus("COMPLETED");
            sampleRepository.save(sample);
        } else {
            sample.setStatus("IN_PROGRESS");
            sampleRepository.save(sample);
        }
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

                if (!sectionData.isEmpty()) {
                    data.put(sectionId, sectionData);
                }
            }
        }
        return data;
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

    private Map<String, Object> buildContextData(SampleTest st) {
        Map<String, Object> ctx = new HashMap<>();
        Sample s = st.getSample();
        Job j = s.getJob();
        
        ctx.put("sample.sampleNumber", s.getSampleNumber());
        ctx.put("sample.product.name", s.getProduct() != null ? s.getProduct().getName() : null);
        ctx.put("sample.receivedAt", s.getReceivedAt());
        ctx.put("sample.sampledAt", s.getSampledAt());
        
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
}
