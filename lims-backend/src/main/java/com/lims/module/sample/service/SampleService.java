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
import com.lims.module.sample.repository.AttachmentRepository;
import com.lims.module.sample.repository.SpecimenRepository;
import com.lims.module.sample.entity.Attachment;
import com.lims.module.sample.dto.SpecimenDTO;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.UserRepository;
import com.lims.module.notification.event.SampleReceivedEvent;
import java.util.stream.Collectors;
import com.lims.module.notification.service.DataSyncService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@Slf4j
public class SampleService {

    private final JobRepository jobRepository;
    private final SampleRepository sampleRepository;
    private final ClientRepository clientRepository;
    private final ProductRepository productRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final AnalysisService analysisService;
    private final SampleTestRepository sampleTestRepository;
    private final AttachmentRepository attachmentRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final DataSyncService dataSyncService;
    private final com.lims.common.service.SequenceService sequenceService;
    private final SpecimenRepository specimenRepository;

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
        String jobNumber = sequenceService.getNextJobNumber();

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

        // Notify job creator (personal notification)
        eventPublisher.publishEvent(new SampleReceivedEvent(this, saved.getJob().getCreatedBy().getId(), saved.getSampleNumber()));

        // Broadcast global sync event for all clients
        dataSyncService.broadcast("SAMPLE", saved.getId(), "RECEIVED");

        return mapToDTO(saved);
    }

    private List<Long> getRestrictedClientIds() {
        if (SecurityContextHolder.getContext().getAuthentication() == null) return null;
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (username == null || "anonymousUser".equals(username)) return null;
        
        return userRepository.findByUsername(username)
                .map(User::getAssociatedClients)
                .filter(clients -> clients != null && !clients.isEmpty())
                .map(clients -> clients.stream().map(Client::getId).collect(Collectors.toList()))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public DashboardStatsDTO getDashboardStats() {
        List<Long> restrictedClientIds = getRestrictedClientIds();
        long unreceived, inProgress, awaitingAuth, authorizedToday, rejected;

        if (restrictedClientIds != null) {
            unreceived = sampleRepository.countByStatusAndJobClientIdIn("REGISTERED", restrictedClientIds);
            inProgress = sampleRepository.countByStatusAndJobClientIdIn("RECEIVED", restrictedClientIds) + sampleRepository.countByStatusAndJobClientIdIn("IN_PROGRESS", restrictedClientIds);
            awaitingAuth = sampleRepository.countByStatusAndJobClientIdIn("COMPLETED", restrictedClientIds);
            authorizedToday = sampleRepository.countByStatusAndJobClientIdIn("AUTHORIZED", restrictedClientIds);
            rejected = sampleRepository.countByStatusAndJobClientIdIn("REJECTED", restrictedClientIds);
        } else {
            unreceived = sampleRepository.countByStatus("REGISTERED");
            inProgress = sampleRepository.countByStatus("RECEIVED") + sampleRepository.countByStatus("IN_PROGRESS");
            awaitingAuth = sampleRepository.countByStatus("COMPLETED");
            authorizedToday = sampleRepository.countByStatus("AUTHORIZED");
            rejected = sampleRepository.countByStatus("REJECTED");
        }

        return DashboardStatsDTO.builder()
                .unreceivedCount(unreceived)
                .inProgressCount(inProgress)
                .awaitingAuthorizationCount(awaitingAuth)
                .authorizedTodayCount(authorizedToday)
                .rejectedCount(rejected)
                .build();
    }

    @Transactional(readOnly = true)
    public Page<SampleDTO> listSamples(String search, List<String> statuses, Pageable pageable) {
        List<Long> restrictedClientIds = getRestrictedClientIds();

        Specification<Sample> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (restrictedClientIds != null) {
                predicates.add(root.join("job").get("client").get("id").in(restrictedClientIds));
            }
            
            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get("status").in(statuses));
            }
            
            if (search != null && !search.trim().isEmpty()) {
                String lowercaseSearch = "%" + search.toLowerCase() + "%";
                List<Predicate> searchPredicates = new ArrayList<>();
                // Search in Sample fields
                searchPredicates.add(cb.like(cb.lower(root.get("sampleNumber")), lowercaseSearch));
                searchPredicates.add(cb.like(cb.lower(root.get("description")), lowercaseSearch));
                searchPredicates.add(cb.like(cb.lower(root.get("status")), lowercaseSearch));
                
                // Search in related Job/Client/Project fields
                searchPredicates.add(cb.like(cb.lower(root.join("job").get("client").get("name")), lowercaseSearch));
                searchPredicates.add(cb.like(cb.lower(root.join("job").get("projectName")), lowercaseSearch));
                
                // Search in Product fields
                searchPredicates.add(cb.like(cb.lower(root.join("product").get("name")), lowercaseSearch));
                
                predicates.add(cb.or(searchPredicates.toArray(new Predicate[0])));
            }
            
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };

        return sampleRepository.findAll(spec, pageable)
                .map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public SampleDTO getSampleDetails(Long id) {
        Sample sample = sampleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sample not found"));
        
        List<Long> restrictedClientIds = getRestrictedClientIds();
        if (restrictedClientIds != null && !restrictedClientIds.contains(sample.getJob().getClient().getId())) {
            throw new AccessDeniedException("Access Denied");
        }
        
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

        Sample saved = sampleRepository.save(sample);

        // Broadcast global sync event for all clients
        dataSyncService.broadcast("SAMPLE", saved.getId(), "REJECTED");

        return mapToDTO(saved);
    }

    @Transactional
    public void deleteSample(Long id) {
        Sample sample = sampleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sample not found"));

        // 1. Cleanup physical files
        List<Attachment> attachments = attachmentRepository.findBySampleIdOrderByCreatedAtDesc(id);
        for (Attachment attachment : attachments) {
            if (attachment.getFilePath() != null) {
                try {
                    Files.deleteIfExists(Paths.get(attachment.getFilePath()));
                    log.info("Deleted physical file for sample deletion: {}", attachment.getFilePath());
                } catch (IOException e) {
                    log.error("Failed to delete sample file: {}", attachment.getFilePath(), e);
                }
            }
        }

        Job job = sample.getJob();
        sampleRepository.delete(sample);

        // 2. Check if job should be deleted (if it was the last sample)
        long remainingSamples = sampleRepository.countByJobId(job.getId());
        if (remainingSamples == 0) { // All samples in job deleted
             jobRepository.delete(job);
             log.info("Deleted empty JOB after sample deletion: {}", job.getJobNumber());
        }
    }


    private SampleDTO mapToDTO(Sample sample) {
        List<SpecimenDTO> specimenDTOs = specimenRepository.findBySampleIdOrderBySpecimenNumberAsc(sample.getId())
                .stream().map(sp -> SpecimenDTO.builder()
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
                        .build())
                .collect(Collectors.toList());

        long authorizedCount = specimenDTOs.stream().filter(s -> "AUTHORIZED".equals(s.getStatus())).count();

        return SampleDTO.builder()
                .id(sample.getId())
                .sampleNumber(sample.getSampleNumber())
                .productName(sample.getProduct().getName())
                .description(sample.getDescription())
                .status(sample.getStatus())
                .conditionOnReceipt(sample.getConditionOnReceipt())
                .receivedAt(sample.getReceivedAt())
                .sampledAt(sample.getSampledAt())
                .clientName(sample.getJob().getClient().getName())
                .jobNumber(sample.getJob().getJobNumber())
                .specimens(specimenDTOs)
                .specimenCount(specimenDTOs.size())
                .authorizedSpecimenCount((int) authorizedCount)
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
