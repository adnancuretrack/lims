package com.lims.module.sample.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data @Builder
public class SampleTestDTO {
    private Long id;
    private Long testMethodId;
    private String testMethodName;
    private String testMethodCode;
    private String status;
    private Integer sortOrder;
    private Long testResultId;
    private Long instrumentId;
    private String reagentLot;
    private boolean hasWorksheet;
}
