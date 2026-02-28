package com.lims.module.notification.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data @Builder
public class NotificationDTO {
    private Long id;
    private String title;
    private String message;
    private String type;
    private boolean read;
    private Instant createdAt;
}
