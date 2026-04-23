package com.lims.module.sample.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ResultEntryRequest {
    private Long sampleTestId;
    private Long instrumentId;
    private String reagentLot;
}
