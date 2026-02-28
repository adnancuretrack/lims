package com.lims.module.qc.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AddDataPointRequest {
    @NotNull
    private BigDecimal measuredValue;

    private Long lotId;
    private String notes;
}
