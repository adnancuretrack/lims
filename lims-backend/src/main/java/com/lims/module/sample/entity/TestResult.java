package com.lims.module.sample.entity;

import com.lims.common.entity.BaseEntity;
import com.lims.module.security.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.Audited;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "test_results")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Audited
public class TestResult extends BaseEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sample_test_id", nullable = false)
    private SampleTest sampleTest;

    @Column(name = "numeric_value", precision = 19, scale = 4)
    private BigDecimal numericValue;

    @Column(name = "text_value", columnDefinition = "TEXT")
    private String textValue;

    @Column(name = "is_out_of_range")
    private boolean isOutOfRange;

    @Column(name = "flag_color", length = 20)
    private String flagColor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entered_by")
    private User enteredBy;

    @Column(name = "entered_at")
    @Builder.Default
    private Instant enteredAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instrument_id")
    private com.lims.module.inventory.entity.Instrument instrument;

    @Column(name = "reagent_lot", length = 200)
    private String reagentLot;

    @OneToMany(mappedBy = "testResult", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ResultReview> reviews = new ArrayList<>();

    public void addReview(ResultReview review) {
        reviews.add(review);
        review.setTestResult(this);
    }

    public String getDisplayValue() {
        if (numericValue != null) {
            return numericValue.toString() + (textValue != null ? " (" + textValue + ")" : "");
        }
        return textValue != null ? textValue : "N/A";
    }
}
