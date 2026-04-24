package com.lims.module.document.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.lims.common.entity.BaseEntity;
import com.lims.module.security.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.Audited;

@Entity
@Table(name = "compliance_documents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Audited
public class ComplianceDocument extends BaseEntity {

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_type", length = 100)
    private String fileType;

    @Column(name = "file_path", nullable = false)
    private String filePath;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(length = 500)
    private String description;

    @Column(length = 50)
    private String category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    @JsonIgnore
    private User uploadedBy;
}
