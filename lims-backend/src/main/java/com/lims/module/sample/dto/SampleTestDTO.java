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
    private BigDecimal numericValue;
    private String textValue;
    private boolean isOutOfRange;
    private String flagColor;
    private String unit;
    private BigDecimal minLimit;
    private BigDecimal maxLimit;
    private String resultType;
    private Long testResultId;
    private Long instrumentId;
    private String reagentLot;
}
