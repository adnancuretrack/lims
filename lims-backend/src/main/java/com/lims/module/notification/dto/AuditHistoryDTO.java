package com.lims.module.notification.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data @Builder
public class AuditHistoryDTO {
    private Integer revisionNumber;
    private Instant revisionTimestamp;
    private String username;
    private String action; // ADD, MOD, DEL
    private Object entityData;
}
