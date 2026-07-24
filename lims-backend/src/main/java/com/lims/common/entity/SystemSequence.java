package com.lims.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.*;

@Entity
@Table(name = "system_sequences", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"prefix", "year"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SystemSequence extends BaseEntity {

    @Column(nullable = false, length = 10)
    private String prefix;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "current_val", nullable = false)
    @Builder.Default
    private Long currentVal = 0L;
}
