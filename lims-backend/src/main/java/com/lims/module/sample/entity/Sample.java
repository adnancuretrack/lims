package com.lims.module.sample.entity;

import com.lims.common.entity.BaseEntity;
import com.lims.module.security.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

import org.hibernate.envers.Audited;

@Entity
@Table(name = "samples")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Audited
public class Sample extends BaseEntity {

    @Column(name = "sample_number", nullable = false, unique = true, length = 30)
    private String sampleNumber;

    @ManyToOne(optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(length = 500)
    private String description;

    @Column(name = "sampling_point", length = 200)
    private String samplingPoint;

    @Column(name = "sampled_by", length = 200)
    private String sampledBy;

    @Column(name = "sampled_at")
    private Instant sampledAt;

    @Column(name = "received_at")
    private Instant receivedAt;

    @ManyToOne
    @JoinColumn(name = "received_by")
    private User receivedBy;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "REGISTERED";

    @Column(name = "condition_on_receipt", length = 20)
    @Builder.Default
    private String conditionOnReceipt = "ACCEPTABLE";

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(unique = true, length = 50)
    private String barcode;

    @Column(name = "due_date")
    private Instant dueDate;

    @ManyToOne
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    @OneToMany(mappedBy = "sample", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.Set<SampleTest> sampleTests = new java.util.HashSet<>();

    public void addSampleTest(SampleTest test) {
        sampleTests.add(test);
        test.setSample(this);
    }
}
