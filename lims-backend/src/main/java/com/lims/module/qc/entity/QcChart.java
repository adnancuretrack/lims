package com.lims.module.qc.entity;

import com.lims.common.entity.BaseEntity;
import com.lims.module.sample.entity.TestMethod;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "qc_charts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QcChart extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "test_method_id", nullable = false)
    private TestMethod testMethod;

    @Column(name = "instrument_id")
    private Long instrumentId;

    @Column(name = "chart_type", nullable = false, length = 30)
    @Builder.Default
    private String chartType = "XBAR_R";
    // XBAR_R | XBAR_S | INDIVIDUAL | CUSUM

    @Column(name = "target_value")
    private BigDecimal targetValue;

    @Column(name = "ucl")
    private BigDecimal ucl;

    @Column(name = "lcl")
    private BigDecimal lcl;

    @Column(name = "usl")
    private BigDecimal usl;

    @Column(name = "lsl")
    private BigDecimal lsl;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @OneToMany(mappedBy = "chart", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("measuredAt ASC")
    @Builder.Default
    private List<QcDataPoint> dataPoints = new ArrayList<>();
}
