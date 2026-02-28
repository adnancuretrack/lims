package com.lims.module.qc.entity;

import com.lims.module.security.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "qc_data_points")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QcDataPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "chart_id", nullable = false)
    private QcChart chart;

    @Column(name = "measured_value", nullable = false)
    private BigDecimal measuredValue;

    @Column(name = "measured_at", nullable = false)
    @Builder.Default
    private Instant measuredAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "measured_by")
    private User measuredBy;

    @Column(name = "lot_id")
    private Long lotId;

    @Column(name = "is_violation")
    @Builder.Default
    private boolean violation = false;

    @Column(name = "violation_rule", length = 50)
    private String violationRule;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
