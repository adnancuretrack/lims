package com.lims.module.security.dto;

import jakarta.validation.constraints.Email;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String displayName;
    @Email
    private String email;
    private String phone;
    private String currentPassword;
    private String newPassword;
}
