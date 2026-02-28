package com.lims.module.investigation.service;

import com.lims.module.investigation.dto.CreateInvestigationRequest;
import com.lims.module.investigation.dto.InvestigationDTO;
import com.lims.module.investigation.dto.UpdateInvestigationRequest;
import com.lims.module.investigation.entity.Investigation;
import com.lims.module.investigation.repository.InvestigationRepository;
import com.lims.module.sample.entity.Sample;
import com.lims.module.sample.repository.SampleRepository;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InvestigationService {

    private final InvestigationRepository investigationRepository;
    private final SampleRepository sampleRepository;
    private final UserRepository userRepository;

    @Transactional
    public InvestigationDTO createInvestigation(CreateInvestigationRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Sample sample = null;
        if (request.getRelatedSampleId() != null) {
            sample = sampleRepository.findById(request.getRelatedSampleId())
                    .orElseThrow(() -> new RuntimeException("Sample not found"));
        }

        User assignedTo = null;
        if (request.getAssignedToId() != null) {
            assignedTo = userRepository.findById(request.getAssignedToId())
                    .orElseGet(() -> null); // Allow optional assignment
        }

        // Generate NCR Number: NCR-{Year}-{Count+1}
        int currentYear = LocalDate.now().getYear();
        long count = investigationRepository.count() + 1;
        String ncrNumber = String.format("NCR-%d-%04d", currentYear, count);

        Investigation investigation = Investigation.builder()
                .ncrNumber(ncrNumber)
                .title(request.getTitle())
                .type(request.getType())
                .severity(request.getSeverity())
                .status("OPEN")
                .description(request.getDescription())
                .relatedSample(sample)
                .assignedTo(assignedTo)
                .openedBy(currentUser)
                .openedAt(Instant.now())
                .dueDate(request.getDueDate())
                .build();

        investigation = investigationRepository.save(investigation);
        return toDTO(investigation);
    }

    @Transactional
    public InvestigationDTO updateInvestigation(Long id, UpdateInvestigationRequest request) {
        Investigation investigation = investigationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Investigation not found"));

        if (request.getStatus() != null) {
            investigation.setStatus(request.getStatus());
            if ("CLOSED".equals(request.getStatus())) {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                User currentUser = userRepository.findByUsername(username).orElse(null);
                investigation.setClosedBy(currentUser);
                investigation.setClosedAt(Instant.now());
            }
        }
        if (request.getRootCause() != null) {
            investigation.setRootCause(request.getRootCause());
        }
        if (request.getCorrectiveAction() != null) {
            investigation.setCorrectiveAction(request.getCorrectiveAction());
        }
        if (request.getPreventiveAction() != null) {
            investigation.setPreventiveAction(request.getPreventiveAction());
        }
        if (request.getAssignedToId() != null) {
            User user = userRepository.findById(request.getAssignedToId()).orElse(null);
            investigation.setAssignedTo(user);
        }
        if (request.getDueDate() != null) {
            investigation.setDueDate(request.getDueDate());
        }

        investigation = investigationRepository.save(investigation);
        return toDTO(investigation);
    }

    @Transactional(readOnly = true)
    public List<InvestigationDTO> getAllInvestigations() {
        return investigationRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InvestigationDTO> getMyInvestigations() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return investigationRepository.findByAssignedToId(currentUser.getId()).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InvestigationDTO getInvestigation(Long id) {
        Investigation investigation = investigationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Investigation not found"));
        return toDTO(investigation);
    }

    private InvestigationDTO toDTO(Investigation i) {
        return InvestigationDTO.builder()
                .id(i.getId())
                .ncrNumber(i.getNcrNumber())
                .title(i.getTitle())
                .type(i.getType())
                .severity(i.getSeverity())
                .status(i.getStatus())
                .description(i.getDescription())
                .rootCause(i.getRootCause())
                .correctiveAction(i.getCorrectiveAction())
                .preventiveAction(i.getPreventiveAction())
                .relatedSampleId(i.getRelatedSample() != null ? i.getRelatedSample().getId() : null)
                .relatedSampleNumber(i.getRelatedSample() != null ? i.getRelatedSample().getSampleNumber() : null)
                .assignedToId(i.getAssignedTo() != null ? i.getAssignedTo().getId() : null)
                .assignedToName(i.getAssignedTo() != null ? i.getAssignedTo().getDisplayName() : null)
                .openedById(i.getOpenedBy().getId())
                .openedByName(i.getOpenedBy().getDisplayName())
                .openedAt(i.getOpenedAt())
                .closedById(i.getClosedBy() != null ? i.getClosedBy().getId() : null)
                .closedByName(i.getClosedBy() != null ? i.getClosedBy().getDisplayName() : null)
                .closedAt(i.getClosedAt())
                .dueDate(i.getDueDate())
                .createdAt(i.getCreatedAt())
                .updatedAt(i.getUpdatedAt())
                .build();
    }
}
