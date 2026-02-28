package com.lims.module.erp.service;

import com.lims.module.erp.dto.ErpJobImportRequest;
import com.lims.module.sample.entity.*;
import com.lims.module.sample.repository.*;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ErpIntegrationService {

    private final JobRepository jobRepository;
    private final SampleRepository sampleRepository;
    private final SampleTestRepository sampleTestRepository;
    private final ClientRepository clientRepository;
    private final ProductRepository productRepository;
    private final TestMethodRepository testMethodRepository;
    private final UserRepository userRepository;

    @Transactional
    public String importJob(ErpJobImportRequest request) {
        log.info("Importing job from ERP. External Order ID: {}", request.getExternalOrderId());

        // 1. Resolve Client
        Client client = clientRepository.findByName(request.getClientName())
                .orElseThrow(() -> new RuntimeException("Client not found: " + request.getClientName()));

        // 2. Resolve Product
        Product product = productRepository.findByName(request.getProductName())
                .orElseThrow(() -> new RuntimeException("Product not found: " + request.getProductName()));

        // 3. Create Job
        Job job = Job.builder()
                .jobNumber("ERP-" + request.getExternalOrderId())
                .client(client)
                .project(null) // Optional
                .status("REGISTERED")
                .priority(request.getPriority() != null ? request.getPriority() : "NORMAL")
                .notes("Automated import from ERP system. ExtID: " + request.getExternalOrderId())
                .build();
        job = jobRepository.save(job);

        // 4. Create Samples & Tests
        int sampleIndex = 1;
        for (ErpJobImportRequest.ErpSampleImport sampleReq : request.getSamples()) {
            Sample sample = Sample.builder()
                    .job(job)
                    .sampleNumber(job.getJobNumber() + "-" + String.format("%02d", sampleIndex++))
                    .product(product)
                    .status("REGISTERED")
                    .dueDate(Instant.now().plus(7, ChronoUnit.DAYS))
                    .barcode("BRC-" + sampleReq.getExternalSampleId())
                    .build();
            sample = sampleRepository.save(sample);

            for (String testCode : sampleReq.getTestMethodCodes()) {
                TestMethod method = testMethodRepository.findByCode(testCode)
                        .orElseThrow(() -> new RuntimeException("Test Method not found: " + testCode));

                SampleTest test = SampleTest.builder()
                        .sample(sample)
                        .testMethod(method)
                        .status("PENDING")
                        .build();
                sampleTestRepository.save(test);
            }
        }

        return job.getJobNumber();
    }
    
    // Placeholder for Export Logic
    public void exportResults(Long jobId) {
        log.info("Simulating Export to ERP for Job ID: {}", jobId);
        // In a real scenario, this would send a JSON payload to a Webhook URL
    }
}
