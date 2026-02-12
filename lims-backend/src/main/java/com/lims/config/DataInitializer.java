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

        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseGet(() -> roleRepository.save(Role.builder().name("ADMIN").description("System administrator").build()));

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
    }
}
