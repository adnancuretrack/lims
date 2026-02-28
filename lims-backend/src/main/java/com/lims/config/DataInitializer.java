package com.lims.config;

import com.lims.module.security.entity.Role;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.RoleRepository;
import com.lims.module.security.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * Seeds a default admin user on first startup (dev profile only).
 * Only runs if no users exist in the database.
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Users already exist — skipping seed data");
            return;
        }

        // Create Roles
        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseGet(() -> roleRepository.save(Role.builder().name("ADMIN").description("System administrator").build()));
        
        Role userRole = roleRepository.findByName("USER")
                .orElseGet(() -> roleRepository.save(Role.builder().name("USER").description("Standard user").build()));

        // Create Admin User
        User admin = User.builder()
                .username("admin")
                .passwordHash(passwordEncoder.encode("admin123"))
                .displayName("System Administrator")
                .email("admin@lab.com")
                .authMethod("LOCAL")
                .active(true)
                .roles(Set.of(adminRole))
                .build();

        userRepository.save(admin);
        log.info("Created default admin user (username: admin, password: admin123)");

        // Create Analyst User
        User analyst = User.builder()
                .username("analyst")
                .passwordHash(passwordEncoder.encode("analyst123"))
                .displayName("Lab Analyst")
                .email("analyst@lab.com")
                .authMethod("LOCAL")
                .active(true)
                .roles(Set.of(userRole))
                .build();

        userRepository.save(analyst);
        log.info("Created default analyst user (username: analyst, password: analyst123)");
    }
}
