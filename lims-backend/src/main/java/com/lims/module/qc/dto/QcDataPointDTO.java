package com.lims.module.qc.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder
public class QcDataPointDTO {
    private Long id;
    private BigDecimal measuredValue;
    private Instant measuredAt;
    private String measuredByName;
    private Long lotId;
    private boolean violation;
    private String violationRule;
    private String notes;
}
