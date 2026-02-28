package com.lims.module.qc.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateQcChartRequest {
    @NotBlank
    private String name;

    @NotNull
    private Long testMethodId;

    private Long instrumentId;

    private String chartType = "XBAR_R";

    private BigDecimal targetValue;
    private BigDecimal ucl;
    private BigDecimal lcl;
    private BigDecimal usl;
    private BigDecimal lsl;
}
