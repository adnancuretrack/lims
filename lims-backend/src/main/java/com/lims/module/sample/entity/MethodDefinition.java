package com.lims.module.sample.entity;

import com.lims.common.entity.BaseEntity;
import com.lims.module.security.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.envers.Audited;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "method_definitions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Audited
public class MethodDefinition extends BaseEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "test_method_id", nullable = false)
    private TestMethod testMethod;

    @Column(nullable = false)
    @Builder.Default
    private Integer version = 1;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "DRAFT";
    // DRAFT | PUBLISHED | ARCHIVED

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "schema_definition", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> schemaDefinition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "published_by")
    private User publishedBy;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "report_template_path")
    private String reportTemplatePath;
}
