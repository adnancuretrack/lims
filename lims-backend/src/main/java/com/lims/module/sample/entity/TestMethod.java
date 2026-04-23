package com.lims.module.sample.entity;

import com.lims.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.Audited;

import java.math.BigDecimal;

@Entity
@Table(name = "test_methods")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Audited
public class TestMethod extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "standard_ref", length = 100)
    private String standardRef;

    @Column(name = "tat_hours")
    @Builder.Default
    private Integer tatHours = 24;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "has_worksheet", nullable = false)
    @Builder.Default
    private boolean hasWorksheet = false;

    @Column(name = "active_definition_id")
    private Long activeDefinitionId;
}
