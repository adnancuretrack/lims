package com.lims.module.investigation.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class UpdateInvestigationRequest {
    private String status;
    private String rootCause;
    private String correctiveAction;
    private String preventiveAction;
    private Long assignedToId;
    private LocalDate dueDate;
}
