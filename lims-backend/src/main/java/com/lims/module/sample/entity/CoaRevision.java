package com.lims.module.sample.entity;

import com.lims.common.entity.BaseEntity;
import com.lims.module.security.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "coa_revisions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CoaRevision extends BaseEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sample_id", nullable = false)
    private Sample sample;

    @Column(name = "revision_number", nullable = false)
    private Integer revisionNumber;

    @Column(name = "is_interim", nullable = false)
    @Builder.Default
    private boolean isInterim = true;

    @Column(name = "specimens_included", nullable = false)
    private Integer specimensIncluded;

    @Column(name = "specimens_total", nullable = false)
    private Integer specimensTotal;

    @Column(name = "pdf_snapshot", nullable = false)
    private byte[] pdfSnapshot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "generated_by")
    private User generatedBy;

    @Column(name = "generated_at", nullable = false)
    @Builder.Default
    private Instant generatedAt = Instant.now();

    @Column(columnDefinition = "TEXT")
    private String notes;
}
