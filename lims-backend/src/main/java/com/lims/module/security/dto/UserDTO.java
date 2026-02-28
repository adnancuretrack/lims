package com.lims.module.security.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.List;

@Data @Builder
public class UserDTO {
    private Long id;
    private String username;
    private String displayName;
    private String email;
    private boolean active;
    private List<String> roles;
    private Instant lastLoginAt;
}
