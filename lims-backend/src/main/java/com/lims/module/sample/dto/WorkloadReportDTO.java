package com.lims.module.sample.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class WorkloadReportDTO {
    private String analystName;
    private long samplesAssigned;
    private long testsCompleted;
    private long testsPending;
}
