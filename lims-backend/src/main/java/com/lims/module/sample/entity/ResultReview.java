package com.lims.module.sample.entity;

import com.lims.common.entity.BaseEntity;
import com.lims.module.security.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.Audited;

import java.time.Instant;

@Entity
@Table(name = "result_reviews")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Audited
public class ResultReview extends BaseEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "test_result_id", nullable = false)
    private TestResult testResult;

    @Column(name = "review_step", nullable = false)
    @Builder.Default
    private Integer reviewStep = 1;

    @Column(nullable = false, length = 20)
    private String action; // AUTHORIZE | REJECT

    @Column(columnDefinition = "TEXT")
    private String comment;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @Column(name = "reviewed_at")
    @Builder.Default
    private Instant reviewedAt = Instant.now();
}
