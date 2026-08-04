package com.lims.module.sample.dto;

import lombok.*;
import java.util.Map;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpecimenSubmitRequest {
    private List<Integer> specimenIndices; // 0-based column indices
    private Map<String, Object> data;
    private Map<String, Object> calculatedResults;
    private Map<String, Object> finalResults;
    private boolean isFinalSubmission;
}
