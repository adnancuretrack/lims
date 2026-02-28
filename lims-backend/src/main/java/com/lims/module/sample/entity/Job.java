package com.lims.module.sample.entity;

import com.lims.common.entity.BaseEntity;
import com.lims.module.security.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

import org.hibernate.envers.Audited;

@Entity
@Table(name = "jobs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Audited
public class Job extends BaseEntity {

    @Column(name = "job_number", nullable = false, unique = true, length = 30)
    private String jobNumber;

    @ManyToOne(optional = false)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(name = "project_name", length = 200)
    private String projectName;

    @Column(name = "po_number", length = 50)
    private String poNumber;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String priority = "NORMAL";

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "DRAFT";

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;
}
