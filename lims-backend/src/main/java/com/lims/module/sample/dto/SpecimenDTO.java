package com.lims.module.sample.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.Instant;

@Data @Builder
public class SpecimenDTO {
    private Long id;
    private Long sampleId;
    private Integer specimenNumber;
    private String label;
    private LocalDate scheduledTestDate;
    private String status;
    private String testedBy;
    private Instant testedAt;
    private String authorizedBy;
    private Instant authorizedAt;
    private Long testResultId;
}
