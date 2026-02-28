package com.lims.module.sample.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class DashboardStatsDTO {
    private long unreceivedCount;
    private long inProgressCount;
    private long awaitingAuthorizationCount;
    private long authorizedTodayCount;
}
