package com.lims.module.sample.service;

import com.lims.module.sample.dto.ResultReviewRequest;
import com.lims.module.sample.entity.ResultReview;
import com.lims.module.sample.entity.Sample;
import com.lims.module.sample.entity.SampleTest;
import com.lims.module.sample.entity.TestResult;
import com.lims.module.sample.entity.Specimen;
import com.lims.module.sample.repository.ResultReviewRepository;
import com.lims.module.sample.repository.SampleRepository;
import com.lims.module.sample.repository.SampleTestRepository;
import com.lims.module.sample.repository.TestResultRepository;
import com.lims.module.sample.repository.SpecimenRepository;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.UserRepository;
import com.lims.module.notification.service.DataSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.lims.module.notification.event.ResultAuthorizedEvent;
import com.lims.module.sample.repository.WorksheetDataRepository;
import com.lims.module.sample.entity.WorksheetData;
import java.util.stream.Collectors;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final TestResultRepository testResultRepository;
    private final ResultReviewRepository resultReviewRepository;
    private final SampleTestRepository sampleTestRepository;
    private final SampleRepository sampleRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final DataSyncService dataSyncService;
    private final SpecimenRepository specimenRepository;
    private final WorksheetDataRepository worksheetDataRepository;
    private final WorksheetDataService worksheetDataService;

    @Transactional
    public void reviewResult(ResultReviewRequest request) {
        TestResult result = testResultRepository.findById(request.getTestResultId())
                .orElseThrow(() -> new RuntimeException("Test Result not found"));

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ResultReview review = ResultReview.builder()
                .testResult(result)
                .action(request.getAction())
                .comment(request.getComment())
                .reviewer(currentUser)
                .reviewedAt(Instant.now())
                .reviewStep(1)
                .build();

        resultReviewRepository.save(review);

        SampleTest st = result.getSampleTest();
        boolean hasSpecimens = false;
        WorksheetData wd = st.getWorksheetData();
        if (wd != null) {
            Map<String, Object> schema = wd.getMethodDefinition().getSchemaDefinition();
            if (schema != null && schema.get("sections") instanceof List) {
                List<Map<String, Object>> sections = (List<Map<String, Object>>) schema.get("sections");
                for (Map<String, Object> section : sections) {
                    if (Boolean.TRUE.equals(section.get("hasSpecimens"))) {
                        hasSpecimens = true;
                        break;
                    }
                }
            }
        }

        if (hasSpecimens) {
            List<Specimen> finalizedSpecimens = specimenRepository.findBySampleIdOrderBySpecimenNumberAsc(st.getSample().getId())
                    .stream()
                    .filter(sp -> "FINALIZED".equals(sp.getStatus()))
                    .collect(Collectors.toList());

            for (Specimen spec : finalizedSpecimens) {
                if ("AUTHORIZE".equals(request.getAction())) {
                    spec.setStatus("AUTHORIZED");
                    spec.setAuthorizedBy(currentUser);
                    spec.setAuthorizedAt(Instant.now());
                } else if ("REJECT".equals(request.getAction())) {
                    spec.setStatus("REJECTED");
                }
                specimenRepository.save(spec);
            }

            if ("AUTHORIZE".equals(request.getAction())) {
                if (wd != null) {
                    worksheetDataService.applyAuthorizationMappings(wd, currentUser);
                }
                if (wd != null && wd.isInterimSubmission()) {
                    st.setStatus("INTERIM_AUTHORIZED");
                    wd.setStatus("INTERIM_AUTHORIZED");
                    worksheetDataRepository.save(wd);
                } else {
                    st.setStatus("AUTHORIZED");
                    if (wd != null) {
                        wd.setStatus("FINALIZED");
                        worksheetDataRepository.save(wd);
                    }
                }
            } else if ("REJECT".equals(request.getAction())) {
                st.setStatus("REJECTED");
                if (wd != null) {
                    wd.setStatus("DRAFT");
                    worksheetDataRepository.save(wd);
                }
                for (Specimen spec : finalizedSpecimens) {
                    spec.setStatus("DRAFT");
                    specimenRepository.save(spec);
                }
            }
        } else {
            if ("AUTHORIZE".equals(request.getAction())) {
                if (wd != null) {
                    worksheetDataService.applyAuthorizationMappings(wd, currentUser);
                }
                st.setStatus("AUTHORIZED");
                if (wd != null) {
                    wd.setStatus("FINALIZED");
                    worksheetDataRepository.save(wd);
                }
                eventPublisher.publishEvent(new ResultAuthorizedEvent(this, result.getEnteredBy().getId(), st.getSample().getSampleNumber(), st.getTestMethod().getName()));
            } else if ("REJECT".equals(request.getAction())) {
                st.setStatus("REJECTED");
                if (wd != null) {
                    wd.setStatus("DRAFT");
                    worksheetDataRepository.save(wd);
                }
            }
        }
        
        sampleTestRepository.save(st);
        updateSampleOverallStatus(st.getSample());

        dataSyncService.broadcast("SAMPLE", st.getSample().getId(), "REVIEW_" + request.getAction());
    }

    private void updateSampleOverallStatus(Sample sample) {
        List<SampleTest> tests = sampleTestRepository.findBySampleIdOrderBySortOrderAscIdAsc(sample.getId());
        
        boolean anyRejected = tests.stream().anyMatch(t -> "REJECTED".equals(t.getStatus()));
        boolean anySpecimenRejected = specimenRepository.countBySampleIdAndStatus(sample.getId(), "REJECTED") > 0;
        
        if (anyRejected || anySpecimenRejected) {
            sample.setStatus("REJECTED");
        } else {
            boolean allTestsAuthorized = tests.stream().allMatch(t -> "AUTHORIZED".equals(t.getStatus()));
            if (allTestsAuthorized) {
                sample.setStatus("AUTHORIZED");
            } else {
                boolean anyActive = tests.stream().anyMatch(t -> "IN_PROGRESS".equals(t.getStatus()) 
                        || "INTERIM_AUTHORIZED".equals(t.getStatus()) 
                        || "PENDING".equals(t.getStatus()));
                if (anyActive) {
                    sample.setStatus("IN_PROGRESS");
                } else {
                    sample.setStatus("COMPLETED");
                }
            }
        }
        
        sampleRepository.save(sample);
    }
}
