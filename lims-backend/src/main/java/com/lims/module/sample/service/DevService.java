package com.lims.module.sample.service;

import com.lims.module.sample.entity.Attachment;
import com.lims.module.sample.repository.AttachmentRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DevService {

    private final AttachmentRepository attachmentRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public void wipeAllSamples() {
        log.info("Starting bulk wipe process...");

        // 1. Cleanup physical files
        List<Attachment> attachments = attachmentRepository.findAll();
        log.info("Found {} attachment records to process for physical file removal", attachments.size());
        
        for (Attachment attachment : attachments) {
            if (attachment.getFilePath() != null) {
                try {
                    Path path = Paths.get(attachment.getFilePath());
                    if (Files.exists(path)) {
                        Files.delete(path);
                        log.info("Deleted physical file: {}", attachment.getFilePath());
                    } else {
                        log.warn("Physical file not found on disk, skipping: {}", attachment.getFilePath());
                    }
                } catch (IOException e) {
                    log.error("Failed to delete physical file: {}", attachment.getFilePath(), e);
                }
            }
        }

        // 2. Wipe database tables using TRUNCATE CASCADE
        log.info("Executing TRUNCATE TABLE jobs CASCADE...");
        entityManager.createNativeQuery("TRUNCATE TABLE jobs CASCADE").executeUpdate();
        
        // 3. Wipe Audit Tables (Envers)
        String[] auditTables = {
            "jobs_aud", "samples_aud", "sample_tests_aud", "test_results_aud", 
            "worksheet_data_aud", "result_reviews_aud", "attachments_aud", "revinfo"
        };
        
        for (String table : auditTables) {
            try {
                log.info("Truncating audit table: {}", table);
                entityManager.createNativeQuery("TRUNCATE TABLE " + table + " CASCADE").executeUpdate();
            } catch (Exception e) {
                log.warn("Failed to truncate audit table {}: {}", table, e.getMessage());
            }
        }
        
        log.info("Bulk wipe process completed successfully.");
    }
}
