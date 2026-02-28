package com.lims.module.sample.entity;

import com.lims.common.entity.BaseEntity;
import com.lims.module.security.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.Audited;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sample_tests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Audited
public class SampleTest extends BaseEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sample_id", nullable = false)
    private Sample sample;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "test_method_id", nullable = false)
    private TestMethod testMethod;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING";
    // PENDING | IN_PROGRESS | COMPLETED | AUTHORIZED | REJECTED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    @Column(name = "instrument_id")
    private Long instrumentId;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "is_retest")
    private boolean isRetest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_test_id")
    private SampleTest parentTest;

    @OneToMany(mappedBy = "sampleTest", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TestResult> results = new ArrayList<>();

    public void addResult(TestResult result) {
        results.add(result);
        result.setSampleTest(this);
    }

    public TestResult getLastResult() {
        if (results == null || results.isEmpty()) {
            return null;
        }
        return results.get(results.size() - 1);
    }
}
