package com.lims.module.sample.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class TatReportDTO {
    private String status;
    private long count;
    private double averageTatHours;
    private double minTatHours;
    private double maxTatHours;
}
