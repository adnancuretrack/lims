package com.lims.module.security.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data @Builder
public class UserProfileDTO {
    private String username;
    private String displayName;
    private String email;
    private String phone;
    private List<String> roles;
    private boolean hasSignature;
}
