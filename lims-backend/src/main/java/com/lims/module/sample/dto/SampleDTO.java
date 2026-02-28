package com.lims.module.sample.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data @Builder
public class SampleDTO {
    private Long id;
    private String sampleNumber;
    private String productName;
    private String description;
    private String status;
    private String conditionOnReceipt;
    private Instant receivedAt;
    private String barcode;
}
