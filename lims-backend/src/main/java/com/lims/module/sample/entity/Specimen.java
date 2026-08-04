package com.lims.module.sample.entity;

import com.lims.common.entity.BaseEntity;
import com.lims.module.security.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.Audited;

import java.time.LocalDate;
import java.time.Instant;

@Entity
@Table(name = "specimens")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Audited
public class Specimen extends BaseEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sample_id", nullable = false)
    private Sample sample;

    @Column(name = "specimen_number", nullable = false)
    private Integer specimenNumber;

    @Column(length = 100)
    private String label;

    @Column(name = "scheduled_test_date")
    private LocalDate scheduledTestDate;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "DRAFT";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tested_by")
    private User testedBy;

    @Column(name = "tested_at")
    private Instant testedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "authorized_by")
    private User authorizedBy;

    @Column(name = "authorized_at")
    private Instant authorizedAt;
}
