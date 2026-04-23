package com.lims.module.sample.service;

import com.lims.module.sample.dto.ResultEntryRequest;
import com.lims.module.sample.dto.SampleTestDTO;
import com.lims.module.sample.entity.ProductTest;
import com.lims.module.sample.entity.Sample;
import com.lims.module.sample.entity.SampleTest;
import com.lims.module.sample.entity.TestResult;
import com.lims.module.sample.repository.ProductTestRepository;
import com.lims.module.sample.repository.SampleRepository;
import com.lims.module.sample.repository.SampleTestRepository;
import com.lims.module.sample.repository.TestResultRepository;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.UserRepository;
import com.lims.module.inventory.repository.InstrumentRepository;
import com.lims.module.notification.service.DataSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalysisService {

    private final SampleRepository sampleRepository;
    private final SampleTestRepository sampleTestRepository;
    private final TestResultRepository testResultRepository;
    private final ProductTestRepository productTestRepository;
    private final UserRepository userRepository;
    private final InstrumentRepository instrumentRepository;
    private final DataSyncService dataSyncService;

    @Transactional(readOnly = true)
    public List<SampleTestDTO> getTestsForSample(Long sampleId) {
        return sampleTestRepository.findBySampleIdOrderBySortOrderAscIdAsc(sampleId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void enterResult(ResultEntryRequest request) {
        SampleTest st = sampleTestRepository.findById(request.getSampleTestId())
                .orElseThrow(() -> new RuntimeException("Sample Test not found"));

        if ("AUTHORIZED".equals(st.getStatus())) {
            throw new RuntimeException("Cannot edit authorized result");
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Update or Create Result
        TestResult result = st.getResults().isEmpty() ? new TestResult() : st.getResults().get(0);
        result.setSampleTest(st);
        result.setEnteredBy(currentUser);
        result.setReagentLot(request.getReagentLot());

        if (request.getInstrumentId() != null) {
            result.setInstrument(instrumentRepository.findById(request.getInstrumentId()).orElse(null));
        } else {
            result.setInstrument(null);
        }
        
        testResultRepository.save(result);
        
        // Update SampleTest status
        st.setStatus("COMPLETED");
        sampleTestRepository.save(st);

        // Update Sample status if all tests completed
        updateSampleStatusIfFinished(st.getSample());

        // Broadcast global sync event for all clients
        dataSyncService.broadcast("SAMPLE", st.getSample().getId(), "RESULT_ENTERED");
    }

    @Transactional
    public void autoAssignTests(Sample sample) {
        List<ProductTest> defaults = productTestRepository.findByProductId(sample.getProduct().getId());
        for (ProductTest pt : defaults) {
            SampleTest st = SampleTest.builder()
                    .sample(sample)
                    .testMethod(pt.getTestMethod())
                    .status("PENDING")
                    .sortOrder(pt.getSortOrder())
                    .build();
            sampleTestRepository.save(st);
        }
    }

    private void updateSampleStatusIfFinished(Sample sample) {
        List<SampleTest> tests = sampleTestRepository.findBySampleIdOrderBySortOrderAscIdAsc(sample.getId());
        boolean allFinished = tests.stream().allMatch(t -> "COMPLETED".equals(t.getStatus()) || "AUTHORIZED".equals(t.getStatus()));
        if (allFinished) {
            sample.setStatus("COMPLETED"); // Prepared for authorization
            sampleRepository.save(sample);
        } else {
            sample.setStatus("IN_PROGRESS");
            sampleRepository.save(sample);
        }
    }

    public SampleTestDTO mapToDTO(SampleTest st) {
        TestResult latest = st.getResults().isEmpty() ? null : st.getResults().get(0);
        return SampleTestDTO.builder()
                .id(st.getId())
                .testMethodId(st.getTestMethod().getId())
                .testMethodName(st.getTestMethod().getName())
                .testMethodCode(st.getTestMethod().getCode())
                .status(st.getStatus())
                .sortOrder(st.getSortOrder())
                .instrumentId(latest != null && latest.getInstrument() != null ? latest.getInstrument().getId() : null)
                .reagentLot(latest != null ? latest.getReagentLot() : null)
                .hasWorksheet(st.getTestMethod().isHasWorksheet())
                .testResultId(latest != null ? latest.getId() : null)
                .build();
    }
}
