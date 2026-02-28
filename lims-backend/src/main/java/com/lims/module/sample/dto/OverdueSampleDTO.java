package com.lims.module.sample.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data @Builder
public class OverdueSampleDTO {
    private Long sampleId;
    private String sampleNumber;
    private String clientName;
    private String productName;
    private String status;
    private Instant dueDate;
    private long daysOverdue;
    private String assignedTo;
}
