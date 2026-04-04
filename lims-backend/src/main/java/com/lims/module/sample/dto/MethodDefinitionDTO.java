package com.lims.module.sample.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MethodDefinitionDTO {
    private Long id;
    private Long testMethodId;
    private Integer version;
    private String status;
    private Map<String, Object> schemaDefinition;
    private Long publishedBy;
    private Instant publishedAt;
    private String reportTemplatePath;
    private Instant createdAt;
    private Instant updatedAt;
}
