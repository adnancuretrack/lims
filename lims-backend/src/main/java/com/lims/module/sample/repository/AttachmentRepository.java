package com.lims.module.sample.repository;

import com.lims.module.sample.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findBySampleIdOrderByCreatedAtDesc(Long sampleId);
    List<Attachment> findByJobIdOrderByCreatedAtDesc(Long jobId);
}
