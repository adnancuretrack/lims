package com.lims.module.sample.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

@Data @Builder
public class ProjectDTO {
    private Long id;
    
    @NotBlank(message = "Project number is required")
    private String projectNumber;
    
    @NotBlank(message = "Project name is required")
    private String name;
    
    @NotNull(message = "Client ID is required")
    private Long clientId;
    
    private String clientName;
    private String location;
    private String owner;
    private String consultant;
    private String contractor;
    private String contactPerson;
    private String email;
    private String phone;
    private boolean active;
}
