package com.lims.module.sample.dto;

import lombok.Data;

@Data
public class ResultReviewRequest {
    private Long testResultId;
    private String action; // AUTHORIZE | REJECT
    private String comment;
}
