package com.lims.module.sample.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data @Builder
public class JobDTO {
    private Long id;
    private String jobNumber;
    private String clientName;
    private Long projectId;
    private String projectNumber;
    private String projectName;
    private String status;
    private String priority;
    private Instant createdAt;
    private String createdBy;
    private int sampleCount;
    private List<SampleDTO> samples;
}
