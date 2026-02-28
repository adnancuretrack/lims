package com.lims.module.sample.service;

import com.lims.module.sample.dto.JobDTO;
import com.lims.module.sample.dto.SampleDTO;
import com.lims.module.sample.dto.DashboardStatsDTO;
import com.lims.module.sample.dto.SampleRegistrationRequest;
import com.lims.module.sample.dto.SampleReceiptRequest;
import com.lims.module.sample.dto.SampleRejectionRequest;
import com.lims.module.sample.entity.Client;
import com.lims.module.sample.entity.Job;
import com.lims.module.sample.entity.Product;
import com.lims.module.sample.entity.Sample;
import com.lims.module.sample.repository.ClientRepository;
import com.lims.module.sample.repository.JobRepository;
import com.lims.module.sample.repository.SampleTestRepository;
import com.lims.module.sample.repository.ProductRepository;
import com.lims.module.sample.repository.ProjectRepository;
import com.lims.module.sample.repository.SampleRepository;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.UserRepository;
import com.lims.module.notification.event.SampleReceivedEvent;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class SampleService {

    private final JobRepository jobRepository;
    private final SampleRepository sampleRepository;
    private final ClientRepository clientRepository;
    private final ProductRepository productRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final AnalysisService analysisService;
    private final SampleTestRepository sampleTestRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public JobDTO registerJob(SampleRegistrationRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + username));

        Client client = clientRepository.findById(request.getClientId())
                .orElseThrow(() -> new EntityNotFoundException("Client not found"));

        // Resolve Project if provided
        com.lims.module.sample.entity.Project project = null;
        String projectName = request.getProjectName();

        if (request.getProjectId() != null) {
            project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new EntityNotFoundException("Project not found ID: " + request.getProjectId()));
            // Ensure project belongs to client
            if (!project.getClient().getId().equals(client.getId())) {
                 throw new IllegalArgumentException("Project does not belong to selected client");
            }
            // Auto-fill project name from entity if not explicitly provided (or even if provided, entity is source of truth)
            projectName = project.getName();
        }

        // generate job number: J-{Year}-{Sequence}
        // In real app, use a DB sequence or dedicated table for numbering
        String jobNumber = generateJobNumber();

        Job job = Job.builder()
                .jobNumber(jobNumber)
                .client(client)
                .project(project)
                .projectName(projectName)
                .poNumber(request.getPoNumber())
                .priority(request.getPriority() != null ? request.getPriority() : "NORMAL")
                .notes(request.getNotes())
                .status("DRAFT")
                .createdBy(user)
                .build();

        job = jobRepository.save(job);

        List<SampleDTO> sampleDTOs = new ArrayList<>();
        int sequence = 1;

        if (request.getSamples() != null) {
            for (SampleRegistrationRequest.SampleItem item : request.getSamples()) {
                Product product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new EntityNotFoundException("Product not found ID: " + item.getProductId()));

                String sampleNumber = jobNumber + "-" + String.format("%02d", sequence++);

                Sample sample = Sample.builder()
                        .job(job)
                        .product(product)
                        .sampleNumber(sampleNumber)
                        .description(item.getDescription())
                        .samplingPoint(item.getSamplingPoint())
                        .sampledBy(item.getSampledBy())
                        .sampledAt(item.getSampledAt())
                        .status("REGISTERED")
                        .conditionOnReceipt("ACCEPTABLE")
                        .build();

                sample = sampleRepository.save(sample);
                
                // Auto-assign tests from product mapping
                analysisService.autoAssignTests(sample);
                
                sampleDTOs.add(mapToDTO(sample));
            }
        }

        return mapToJobDTO(job, sampleDTOs);
    }

    @Transactional
    public SampleDTO receiveSample(Long id, SampleReceiptRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + username));

        Sample sample = sampleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sample not found"));

        if (!"REGISTERED".equals(sample.getStatus())) {
            throw new IllegalStateException("Sample is already in status: " + sample.getStatus());
        }

        sample.setStatus("RECEIVED");
        sample.setReceivedAt(Instant.now());
        sample.setReceivedBy(user);
        if (request.getCondition() != null) {
            sample.setConditionOnReceipt(request.getCondition());
        }

        Sample saved = sampleRepository.save(sample);

        // Notify job creator
        eventPublisher.publishEvent(new SampleReceivedEvent(this, saved.getJob().getCreatedBy().getId(), saved.getSampleNumber()));

        return mapToDTO(saved);
    }

    @Transactional(readOnly = true)
    public DashboardStatsDTO getDashboardStats() {
        long unreceived = sampleRepository.countByStatus("REGISTERED");
        long inProgress = sampleRepository.countByStatus("RECEIVED");
        // These will be wired properly in Batch 3
        long awaitingAuth = sampleRepository.countByStatus("COMPLETED");
        long authorizedToday = sampleRepository.countByStatus("AUTHORIZED");

        return DashboardStatsDTO.builder()
                .unreceivedCount(unreceived)
                .inProgressCount(inProgress)
                .awaitingAuthorizationCount(awaitingAuth)
                .authorizedTodayCount(authorizedToday)
                .build();
    }

    @Transactional(readOnly = true)
    public Page<SampleDTO> listSamples(Pageable pageable) {
        return sampleRepository.findByOrderByCreatedAtDesc(pageable)
                .map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public SampleDTO getSampleDetails(Long id) {
        Sample sample = sampleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sample not found"));
        return mapToDTO(sample);
    }

    @Transactional(readOnly = true)
    public List<com.lims.module.sample.dto.SampleTestDTO> getSampleTests(Long id) {
        return sampleTestRepository.findBySampleIdOrderBySortOrderAscIdAsc(id).stream()
                .map(analysisService::mapToDTO)
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public SampleDTO rejectSample(Long id, SampleRejectionRequest request, String username) {
        Sample sample = sampleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sample not found"));

        if (!"REGISTERED".equals(sample.getStatus())) {
            throw new IllegalStateException("Only REGISTERED samples can be rejected");
        }

        sample.setStatus("REJECTED");
        sample.setRejectionReason(request.getReason());

        return mapToDTO(sampleRepository.save(sample));
    }

    // Simplistic numbering for demo. Real implementation would use Redis/DB sequence.
    private String generateJobNumber() {
        return "J" + Year.now().getValue() + "-" + System.currentTimeMillis() % 10000;
    }

    private SampleDTO mapToDTO(Sample sample) {
        return SampleDTO.builder()
                .id(sample.getId())
                .sampleNumber(sample.getSampleNumber())
                .productName(sample.getProduct().getName())
                .description(sample.getDescription())
                .status(sample.getStatus())
                .conditionOnReceipt(sample.getConditionOnReceipt())
                .receivedAt(sample.getReceivedAt())
                .build();
    }

    private JobDTO mapToJobDTO(Job job, List<SampleDTO> samples) {
        return JobDTO.builder()
                .id(job.getId())
                .jobNumber(job.getJobNumber())
                .clientName(job.getClient().getName())
                .projectId(job.getProject() != null ? job.getProject().getId() : null)
                .projectNumber(job.getProject() != null ? job.getProject().getProjectNumber() : null)
                .projectName(job.getProjectName()) // Used stored projectName as fallback or source
                .status(job.getStatus())
                .priority(job.getPriority())
                .createdAt(job.getCreatedAt())
                .createdBy(job.getCreatedBy() != null ? job.getCreatedBy().getDisplayName() : "System")
                .sampleCount(samples.size())
                .samples(samples)
                .build();
    }
}
