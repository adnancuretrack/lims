package com.lims.module.security.service;

import com.lims.module.security.dto.LoginRequest;
import com.lims.module.security.dto.LoginResponse;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        // Update last login timestamp
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        var roles = user.getRoles().stream().map(r -> r.getName()).toList();
        String token = jwtService.generateToken(user.getUsername(), roles);

        return LoginResponse.builder()
                .token(token)
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .roles(roles)
                .build();
    }
}
