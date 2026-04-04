package com.lims.module.sample.dto;

import lombok.*;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorksheetSubmitRequest {
    private Map<String, Object> data;
    private Map<String, Object> calculatedResults;
    private Map<String, Object> finalResults;
}
