package com.lims.module.security.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data @AllArgsConstructor @Builder
public class LoginResponse {
    private String token;
    private String username;
    private String displayName;
    private List<String> roles;
}
