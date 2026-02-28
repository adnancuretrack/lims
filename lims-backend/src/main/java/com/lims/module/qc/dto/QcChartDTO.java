package com.lims.module.qc.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data @Builder
public class QcChartDTO {
    private Long id;
    private String name;
    private Long testMethodId;
    private String testMethodName;
    private Long instrumentId;
    private String chartType;
    private BigDecimal targetValue;
    private BigDecimal ucl;
    private BigDecimal lcl;
    private BigDecimal usl;
    private BigDecimal lsl;
    private boolean active;
    private Instant createdAt;
    private List<QcDataPointDTO> dataPoints;
}
