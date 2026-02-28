package com.lims.module.security.dto;

import lombok.Data;
import java.util.List;

@Data
public class UpdateUserRequest {
    private String displayName;
    private String email;
    private List<String> roles;
    private Boolean active;
}
