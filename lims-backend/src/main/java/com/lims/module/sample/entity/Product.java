package com.lims.module.sample.entity;

import com.lims.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.Audited;

@Entity
@Table(name = "products")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Audited
public class Product extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(length = 100)
    private String category;

    @Column(name = "sampling_instructions", columnDefinition = "TEXT")
    private String samplingInstructions;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;
}
