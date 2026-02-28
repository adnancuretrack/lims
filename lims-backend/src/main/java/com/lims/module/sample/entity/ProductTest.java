package com.lims.module.sample.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "product_tests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductTest {

    @EmbeddedId
    private ProductTestId id;

    @ManyToOne
    @MapsId("productId")
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne
    @MapsId("testMethodId")
    @JoinColumn(name = "test_method_id")
    private TestMethod testMethod;

    @Column(name = "is_mandatory", nullable = false)
    @Builder.Default
    private boolean mandatory = true;

    @Column(name = "sort_order")
    private Integer sortOrder;
}
