package com.lims.module.security.service;

import com.lims.module.security.dto.UpdateProfileRequest;
import com.lims.module.security.dto.UserProfileDTO;
import com.lims.module.security.entity.Role;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${lims.upload.dir:./uploads}")
    private String uploadDir;

    @Transactional(readOnly = true)
    public UserProfileDTO getProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToProfileDTO(user);
    }

    @Transactional
    public UserProfileDTO updateProfile(String username, UpdateProfileRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getDisplayName() != null) {
            user.setDisplayName(request.getDisplayName());
        }
        if (request.getEmail() != null) {
            user.setEmail(request.getEmail());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }

        if (request.getNewPassword() != null && !request.getNewPassword().isEmpty()) {
            if (request.getCurrentPassword() == null || !passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
                throw new RuntimeException("Invalid current password");
            }
            if (request.getNewPassword().length() < 6) {
                throw new RuntimeException("New password must be at least 6 characters");
            }
            user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        }

        return mapToProfileDTO(userRepository.save(user));
    }

    @Transactional
    public void uploadSignature(String username, MultipartFile file) throws IOException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || (!originalFilename.toLowerCase().endsWith(".png") && !originalFilename.toLowerCase().endsWith(".jpg") && !originalFilename.toLowerCase().endsWith(".jpeg"))) {
            throw new RuntimeException("Only PNG or JPG images are allowed");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new RuntimeException("Image size exceeds maximum allowed size (5MB)");
        }

        BufferedImage image = ImageIO.read(file.getInputStream());
        if (image == null) {
            throw new RuntimeException("Invalid image file");
        }

        int width = image.getWidth();
        int height = image.getHeight();

        if (width < 100 || height < 30) {
            throw new RuntimeException("Image dimensions below minimum required size (100x30)");
        }
        if (height > width) {
            throw new RuntimeException("Image must be landscape oriented");
        }

        Path root = Paths.get(uploadDir, "signatures");
        if (!Files.exists(root)) {
            Files.createDirectories(root);
        }

        // Delete old signature if exists
        if (user.getSignatureImagePath() != null) {
            Path oldPath = Paths.get(user.getSignatureImagePath());
            if (Files.exists(oldPath)) {
                Files.delete(oldPath);
            }
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        String fileName = user.getId() + "_" + UUID.randomUUID() + extension;
        Path filePath = root.resolve(fileName);
        
        file.transferTo(filePath.toAbsolutePath().toFile());

        user.setSignatureImagePath(filePath.toString());
        userRepository.save(user);
    }

    public Path getSignatureFile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getSignatureImagePath() == null) {
            throw new RuntimeException("Signature not found");
        }

        Path path = Paths.get(user.getSignatureImagePath());
        if (!Files.exists(path)) {
            throw new RuntimeException("Signature file not found on disk");
        }
        return path;
    }

    private UserProfileDTO mapToProfileDTO(User user) {
        return UserProfileDTO.builder()
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
                .hasSignature(user.getSignatureImagePath() != null)
                .build();
    }
}
