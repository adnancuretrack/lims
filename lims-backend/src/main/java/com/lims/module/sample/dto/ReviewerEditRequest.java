package com.lims.module.sample.dto;

import lombok.*;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewerEditRequest {
    private Map<String, Object> data;
    private String comment;
}
