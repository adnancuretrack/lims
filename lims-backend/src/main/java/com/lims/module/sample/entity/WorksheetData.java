package com.lims.module.sample.entity;

import com.lims.common.entity.BaseEntity;
import com.lims.module.security.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.envers.Audited;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "worksheet_data")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Audited
public class WorksheetData extends BaseEntity {

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sample_test_id", nullable = false, unique = true)
    private SampleTest sampleTest;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "method_definition_id", nullable = false)
    private MethodDefinition methodDefinition;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private Map<String, Object> data = new HashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "calculated_results", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private Map<String, Object> calculatedResults = new HashMap<>();

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "DRAFT";
    // DRAFT | SUBMITTED | REVIEWED | FINALIZED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by")
    private User submittedBy;

    @Column(name = "submitted_at")
    private Instant submittedAt;
}
