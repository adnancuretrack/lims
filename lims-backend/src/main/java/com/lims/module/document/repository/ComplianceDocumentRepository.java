package com.lims.module.document.repository;

import com.lims.module.document.entity.ComplianceDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComplianceDocumentRepository extends JpaRepository<ComplianceDocument, Long> {
    List<ComplianceDocument> findAllByOrderByCreatedAtDesc();
}
