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

    @Column(name = "result_type", nullable = false, length = 30)
    @Builder.Default
    private String resultType = "QUANTITATIVE";

    @Column(length = 30)
    private String unit;

    @Column(name = "decimal_places")
    @Builder.Default
    private Integer decimalPlaces = 2;

    @Column(name = "min_limit")
    private BigDecimal minLimit;

    @Column(name = "max_limit")
    private BigDecimal maxLimit;

    @Column(name = "tat_hours")
    @Builder.Default
    private Integer tatHours = 24;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    public String getLimitsDisplay() {
        if (minLimit != null && maxLimit != null) {
            return minLimit + " - " + maxLimit;
        } else if (minLimit != null) {
            return "> " + minLimit;
        } else if (maxLimit != null) {
            return "< " + maxLimit;
        }
        return "N/A";
    }
}
