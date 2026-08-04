package com.lims.module.sample.dto;

import lombok.*;
import java.time.Instant;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
public class CoaRevisionDTO {
    private Long id;
    private Long sampleId;
    private Integer revisionNumber;
    private boolean isInterim;
    private Integer specimensIncluded;
    private Integer specimensTotal;
    private String generatedBy;
    private Instant generatedAt;
    private String notes;
}
