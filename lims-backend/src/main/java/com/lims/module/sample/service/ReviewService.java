package com.lims.module.sample.service;

import com.lims.module.sample.dto.ResultReviewRequest;
import com.lims.module.sample.entity.ResultReview;
import com.lims.module.sample.entity.Sample;
import com.lims.module.sample.entity.SampleTest;
import com.lims.module.sample.entity.TestResult;
import com.lims.module.sample.repository.ResultReviewRepository;
import com.lims.module.sample.repository.SampleRepository;
import com.lims.module.sample.repository.SampleTestRepository;
import com.lims.module.sample.repository.TestResultRepository;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.lims.module.notification.event.ResultAuthorizedEvent;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final TestResultRepository testResultRepository;
    private final ResultReviewRepository resultReviewRepository;
    private final SampleTestRepository sampleTestRepository;
    private final SampleRepository sampleRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

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
                .reviewStep(1) // Default to step 1 for now
                .build();

        resultReviewRepository.save(review);

        SampleTest st = result.getSampleTest();
        if ("AUTHORIZE".equals(request.getAction())) {
            st.setStatus("AUTHORIZED");
            // Notify the user who entered the result (Traceability)
            eventPublisher.publishEvent(new ResultAuthorizedEvent(this, result.getEnteredBy().getId(), st.getSample().getSampleNumber(), st.getTestMethod().getName()));
        } else if ("REJECT".equals(request.getAction())) {
            st.setStatus("REJECTED");
            // Optionally clear the result or mark it for re-entry
        }
        
        sampleTestRepository.save(st);
        updateSampleOverallStatus(st.getSample());
    }

    private void updateSampleOverallStatus(Sample sample) {
        List<SampleTest> tests = sampleTestRepository.findBySampleIdOrderBySortOrderAscIdAsc(sample.getId());
        
        boolean anyRejected = tests.stream().anyMatch(t -> "REJECTED".equals(t.getStatus()));
        boolean allAuthorized = tests.stream().allMatch(t -> "AUTHORIZED".equals(t.getStatus()));
        
        if (anyRejected) {
            sample.setStatus("REJECTED");
        } else if (allAuthorized) {
            sample.setStatus("AUTHORIZED");
        }
        
        sampleRepository.save(sample);
    }
}
