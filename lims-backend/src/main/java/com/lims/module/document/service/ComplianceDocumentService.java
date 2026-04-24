package com.lims.module.document.service;

import com.lims.module.document.entity.ComplianceDocument;
import com.lims.module.document.repository.ComplianceDocumentRepository;
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
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ComplianceDocumentService {

    private final ComplianceDocumentRepository documentRepository;
    private final UserRepository userRepository;

    @Value("${lims.upload.dir:./uploads}")
    private String baseUploadDir;

    private static final String SUB_DIR = "compliance";

    @Transactional
    public ComplianceDocument upload(MultipartFile file, String description, String category, String username) throws IOException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Path uploadPath = Paths.get(baseUploadDir, SUB_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath);

        ComplianceDocument document = ComplianceDocument.builder()
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .filePath(filePath.toString())
                .fileSize(file.getSize())
                .description(description)
                .category(category)
                .uploadedBy(user)
                .build();

        return documentRepository.save(document);
    }

    public List<ComplianceDocument> getAllDocuments() {
        return documentRepository.findAllByOrderByCreatedAtDesc();
    }

    public Path getFilePath(Long id) {
        ComplianceDocument document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found"));
        return Paths.get(document.getFilePath());
    }

    public ComplianceDocument getDocument(Long id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found"));
    }

    @Transactional
    public void delete(Long id) throws IOException {
        ComplianceDocument document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        Path path = Paths.get(document.getFilePath());
        Files.deleteIfExists(path);
        documentRepository.delete(document);
    }
}
