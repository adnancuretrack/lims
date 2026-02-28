package com.lims.module.sample.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class ProductTestDTO {
    private Long testMethodId;
    private String testMethodName;
    private String testMethodCode;
    private boolean mandatory;
    private Integer sortOrder;
}
