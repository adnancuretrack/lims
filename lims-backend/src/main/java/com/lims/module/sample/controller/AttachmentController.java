package com.lims.module.sample.controller;

import com.lims.module.sample.entity.Attachment;
import com.lims.module.sample.service.AttachmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api/attachments")
@RequiredArgsConstructor
@Tag(name = "Attachments", description = "Endpoints for uploading and downloading document attachments")
public class AttachmentController {

    private final AttachmentService attachmentService;

    @PostMapping("/sample/{id}")
    @Operation(summary = "Upload attachment for a sample")
    public ResponseEntity<Attachment> uploadForSample(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) throws IOException {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(attachmentService.uploadForSample(id, file, username));
    }

    @PostMapping("/job/{id}")
    @Operation(summary = "Upload attachment for a job")
    public ResponseEntity<Attachment> uploadForJob(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) throws IOException {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(attachmentService.uploadForJob(id, file, username));
    }

    @GetMapping("/sample/{id}")
    @Operation(summary = "List attachments for a sample")
    public ResponseEntity<List<Attachment>> getForSample(@PathVariable Long id) {
        return ResponseEntity.ok(attachmentService.getBySample(id));
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "Download an attachment")
    public ResponseEntity<Resource> download(@PathVariable Long id) throws IOException {
        Path path = attachmentService.getFilePath(id);
        Resource resource = new UrlResource(path.toUri());

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}
