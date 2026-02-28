package com.lims.module.investigation.entity;

import com.lims.common.entity.BaseEntity;
import com.lims.module.sample.entity.Sample;
import com.lims.module.security.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "investigations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Investigation extends BaseEntity {

    @Column(name = "ncr_number", nullable = false, unique = true, length = 30)
    private String ncrNumber;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(nullable = false, length = 30)
    private String type; // NCR, CAPA, COMPLAINT, DEVIATION

    @Column(nullable = false, length = 20)
    private String severity; // CRITICAL, MAJOR, MINOR

    @Column(nullable = false, length = 30)
    private String status; // OPEN, INVESTIGATING, CORRECTIVE_ACTION, CLOSED

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "root_cause", columnDefinition = "TEXT")
    private String rootCause;

    @Column(name = "corrective_action", columnDefinition = "TEXT")
    private String correctiveAction;

    @Column(name = "preventive_action", columnDefinition = "TEXT")
    private String preventiveAction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_sample_id")
    private Sample relatedSample;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opened_by", nullable = false)
    private User openedBy;

    @Column(name = "opened_at", nullable = false)
    @Builder.Default
    private Instant openedAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by")
    private User closedBy;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "due_date")
    private LocalDate dueDate;
}
