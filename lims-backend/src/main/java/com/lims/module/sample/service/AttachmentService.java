package com.lims.module.sample.service;

import com.lims.module.sample.entity.Attachment;
import com.lims.module.sample.entity.Job;
import com.lims.module.sample.entity.Sample;
import com.lims.module.sample.repository.AttachmentRepository;
import com.lims.module.sample.repository.JobRepository;
import com.lims.module.sample.repository.SampleRepository;
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
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final SampleRepository sampleRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;

    @Value("${lims.upload.dir:./uploads}")
    private String uploadDir;

    @Transactional
    public Attachment uploadForSample(Long sampleId, MultipartFile file, String username) throws IOException {
        Sample sample = sampleRepository.findById(sampleId)
                .orElseThrow(() -> new RuntimeException("Sample not found"));
        return upload(file, username, sample, null);
    }

    @Transactional
    public Attachment uploadForJob(Long jobId, MultipartFile file, String username) throws IOException {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));
        return upload(file, username, null, job);
    }

    private Attachment upload(MultipartFile file, String username, Sample sample, Job job) throws IOException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Path root = Paths.get(uploadDir);
        if (!Files.exists(root)) {
            Files.createDirectories(root);
        }

        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = root.resolve(fileName);
        Files.copy(file.getInputStream(), filePath);

        Attachment attachment = Attachment.builder()
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .filePath(filePath.toString())
                .fileSize(file.getSize())
                .sample(sample)
                .job(job)
                .uploadedBy(user)
                .build();

        return attachmentRepository.save(attachment);
    }

    public List<Attachment> getBySample(Long sampleId) {
        return attachmentRepository.findBySampleIdOrderByCreatedAtDesc(sampleId);
    }

    public List<Attachment> getByJob(Long jobId) {
        return attachmentRepository.findByJobIdOrderByCreatedAtDesc(jobId);
    }

    public Path getFilePath(Long id) {
        Attachment attachment = attachmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Attachment not found"));
        return Paths.get(attachment.getFilePath());
    }
}
