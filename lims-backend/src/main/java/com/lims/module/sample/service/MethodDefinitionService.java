package com.lims.module.sample.service;

import com.lims.module.sample.dto.MethodDefinitionDTO;
import com.lims.module.sample.entity.MethodDefinition;
import com.lims.module.sample.entity.TestMethod;
import com.lims.module.sample.repository.MethodDefinitionRepository;
import com.lims.module.sample.repository.TestMethodRepository;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MethodDefinitionService {

    private final MethodDefinitionRepository methodDefinitionRepository;
    private final TestMethodRepository testMethodRepository;
    private final UserRepository userRepository;
    private final SchemaValidator schemaValidator;

    @Value("${lims.upload.dir:./uploads}")
    private String uploadDir;

    @Transactional
    public MethodDefinitionDTO uploadTemplate(Long testMethodId, MultipartFile file) {
        MethodDefinition def;
        var draftOpt = methodDefinitionRepository.findByTestMethodIdAndStatus(testMethodId, "DRAFT");
        if (draftOpt.isPresent()) {
            def = draftOpt.get();
        } else {
            TestMethod tm = testMethodRepository.findById(testMethodId)
                    .orElseThrow(() -> new IllegalArgumentException("Test method not found"));
            if (tm.getActiveDefinitionId() != null) {
                def = methodDefinitionRepository.findById(tm.getActiveDefinitionId())
                        .orElseThrow(() -> new IllegalArgumentException("Active definition not found"));
            } else {
                throw new IllegalArgumentException("No DRAFT or active definition available to upload template to");
            }
        }

        try {
            Path root = Paths.get(uploadDir, "templates");
            if (!Files.exists(root)) {
                Files.createDirectories(root);
            }

            String fileName = "tmpl_" + testMethodId + "_" + UUID.randomUUID().toString().substring(0, 8) + ".xlsx";
            Path filePath = root.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            def.setReportTemplatePath(filePath.toString());
            return toDto(methodDefinitionRepository.save(def));
        } catch (IOException e) {
            throw new RuntimeException("Failed to store template file", e);
        }
    }

    @Transactional(readOnly = true)
    public List<MethodDefinitionDTO> getHistory(Long testMethodId) {
        return methodDefinitionRepository.findByTestMethodIdOrderByVersionDesc(testMethodId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MethodDefinitionDTO getActiveDefinition(Long testMethodId) {
        TestMethod tm = testMethodRepository.findById(testMethodId)
                .orElseThrow(() -> new IllegalArgumentException("Test method not found"));
        
        if (tm.getActiveDefinitionId() == null) {
            return null; // Return null or throw custom exception if preferred
        }
        
        MethodDefinition def = methodDefinitionRepository.findById(tm.getActiveDefinitionId())
                .orElseThrow(() -> new IllegalStateException("Active definition ID points to missing row"));
        
        return toDto(def);
    }

    @Transactional
    public MethodDefinitionDTO saveDraft(Long testMethodId, MethodDefinitionDTO dto) {
        TestMethod tm = testMethodRepository.findById(testMethodId)
                .orElseThrow(() -> new IllegalArgumentException("Test method not found"));

        // Load existing DRAFT or create a new version if only PUBLISHED exists
        MethodDefinition draft = methodDefinitionRepository.findByTestMethodIdAndStatus(testMethodId, "DRAFT")
                .orElseGet(() -> {
                    // Find max version
                    int nextVersion = methodDefinitionRepository.findByTestMethodIdOrderByVersionDesc(testMethodId)
                            .stream().findFirst().map(MethodDefinition::getVersion).orElse(0) + 1;
                    
                    String templatePath = null;
                    if (tm.getActiveDefinitionId() != null) {
                        templatePath = methodDefinitionRepository.findById(tm.getActiveDefinitionId())
                                .map(MethodDefinition::getReportTemplatePath).orElse(null);
                    }

                    return MethodDefinition.builder()
                            .testMethod(tm)
                            .version(nextVersion)
                            .status("DRAFT")
                            .reportTemplatePath(templatePath)
                            .build();
                });

        draft.setSchemaDefinition(dto.getSchemaDefinition());
        draft = methodDefinitionRepository.save(draft);
        
        // Auto-enable the hasWorksheet flag if it's the first time
        if (!tm.isHasWorksheet()) {
            tm.setHasWorksheet(true);
            testMethodRepository.save(tm);
        }

        return toDto(draft);
    }

    @Transactional
    public MethodDefinitionDTO publishDefinition(Long testMethodId, Long userId) {
        MethodDefinition draft = methodDefinitionRepository.findByTestMethodIdAndStatus(testMethodId, "DRAFT")
                .orElseThrow(() -> new IllegalArgumentException("No DRAFT definition available to publish"));
        
        User publisher = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        schemaValidator.validateSchema(draft.getSchemaDefinition());

        // Archive previously active version
        TestMethod tm = draft.getTestMethod();
        if (tm.getActiveDefinitionId() != null) {
            methodDefinitionRepository.findById(tm.getActiveDefinitionId()).ifPresent(oldActive -> {
                oldActive.setStatus("ARCHIVED");
                methodDefinitionRepository.save(oldActive);
            });
        }

        // Publish current draft
        draft.setStatus("PUBLISHED");
        draft.setPublishedBy(publisher);
        draft.setPublishedAt(Instant.now());
        
        MethodDefinition publishedId = methodDefinitionRepository.save(draft);

        // Update Test Method reference
        tm.setActiveDefinitionId(publishedId.getId());
        testMethodRepository.save(tm);

        return toDto(publishedId);
    }

    @Transactional(readOnly = true)
    public MethodDefinition getActiveDefinitionEntity(Long testMethodId) {
        TestMethod tm = testMethodRepository.findById(testMethodId)
                .orElseThrow(() -> new IllegalArgumentException("Test method not found"));
        
        if (tm.getActiveDefinitionId() == null) {
            return null;
        }
        
        return methodDefinitionRepository.findById(tm.getActiveDefinitionId())
                .orElseThrow(() -> new IllegalStateException("Active definition ID points to missing row"));
    }

    private MethodDefinitionDTO toDto(MethodDefinition entity) {
        return MethodDefinitionDTO.builder()
                .id(entity.getId())
                .testMethodId(entity.getTestMethod() != null ? entity.getTestMethod().getId() : null)
                .version(entity.getVersion())
                .status(entity.getStatus())
                .schemaDefinition(entity.getSchemaDefinition())
                .publishedBy(entity.getPublishedBy() != null ? entity.getPublishedBy().getId() : null)
                .publishedAt(entity.getPublishedAt())
                .reportTemplatePath(entity.getReportTemplatePath())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
