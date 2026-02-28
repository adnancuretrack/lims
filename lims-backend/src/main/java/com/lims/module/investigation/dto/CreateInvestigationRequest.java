package com.lims.module.investigation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateInvestigationRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String type; // NCR, CAPA, etc.

    @NotBlank
    private String severity;

    @NotBlank
    private String description;

    private Long relatedSampleId;
    private Long assignedToId;
    private LocalDate dueDate;
}
