package com.lims.module.sample.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
public class SampleRegistrationRequest {
    @NotNull(message = "Client is required")
    private Long clientId;

    private Long projectId;
    private String projectName;
    private String poNumber;
    private String priority; // NORMAL, URGENT, etc.
    private String notes;

    @NotEmpty(message = "At least one sample is required")
    private List<SampleItem> samples;

    @Data
    public static class SampleItem {
        @NotNull(message = "Product is required")
        private Long productId;

        private String description;
        private String samplingPoint;
        private String sampledBy;
        private Instant sampledAt;
        
        // Optional: override default tests for this sample
        private List<Long> testMethodIds;
    }
}
