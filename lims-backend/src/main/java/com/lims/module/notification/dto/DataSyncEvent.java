package com.lims.module.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DataSyncEvent {
    private String entity;   // e.g. "SAMPLE", "SAMPLE_TEST", "JOB"
    private Long entityId;
    private String action;   // e.g. "CREATED", "UPDATED", "STATUS_CHANGE"
}
