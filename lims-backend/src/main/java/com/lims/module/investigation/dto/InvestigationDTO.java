package com.lims.module.investigation.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data @Builder
public class InvestigationDTO {
    private Long id;
    private String ncrNumber;
    private String title;
    private String type;
    private String severity;
    private String status;
    private String description;
    private String rootCause;
    private String correctiveAction;
    private String preventiveAction;
    private Long relatedSampleId;
    private String relatedSampleNumber;
    private Long assignedToId;
    private String assignedToName;
    private Long openedById;
    private String openedByName;
    private Instant openedAt;
    private Long closedById;
    private String closedByName;
    private Instant closedAt;
    private LocalDate dueDate;
    private Instant createdAt;
    private Instant updatedAt;
}
