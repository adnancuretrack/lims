package com.lims.module.document.controller;

import com.lims.module.document.entity.ComplianceDocument;
import com.lims.module.document.service.ComplianceDocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Tag(name = "Compliance Documents", description = "Endpoints for managing quality and compliance documents")
public class ComplianceDocumentController {

    private final ComplianceDocumentService documentService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a compliance document")
    public ResponseEntity<ComplianceDocument> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "category", required = false) String category,
            Principal principal) throws IOException {
        return ResponseEntity.ok(documentService.upload(file, description, category, principal.getName()));
    }

    @GetMapping
    @Operation(summary = "List all compliance documents")
    public ResponseEntity<List<ComplianceDocument>> getAll() {
        return ResponseEntity.ok(documentService.getAllDocuments());
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "Download a compliance document")
    public ResponseEntity<Resource> download(@PathVariable Long id) throws MalformedURLException {
        ComplianceDocument doc = documentService.getDocument(id);
        Path path = documentService.getFilePath(id);
        Resource resource = new UrlResource(path.toUri());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.getFileType() != null ? doc.getFileType() : "application/octet-stream"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getFileName() + "\"")
                .body(resource);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a compliance document (Admin only)")
    public ResponseEntity<Void> delete(@PathVariable Long id) throws IOException {
        documentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
