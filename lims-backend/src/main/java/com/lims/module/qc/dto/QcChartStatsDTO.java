package com.lims.module.qc.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data @Builder
public class QcChartStatsDTO {
    private Long chartId;
    private String chartName;
    private long totalPoints;
    private long violationCount;
    private BigDecimal mean;
    private BigDecimal standardDeviation;
    private BigDecimal cpk;
    private boolean inControl;
}
