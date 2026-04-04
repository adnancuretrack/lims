package com.lims.module.sample.entity;

import com.lims.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Table(name = "section_templates")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SectionTemplate extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String name;

    @Column
    private String description;

    @Column(nullable = false)
    private String category; // e.g. "Physical", "Chemical", "Generic"

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> schemaDefinition;

    @Column
    private String createdBy;
}
