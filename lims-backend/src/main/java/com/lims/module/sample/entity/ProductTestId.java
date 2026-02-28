package com.lims.module.sample.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
public class ProductTestId implements Serializable {
    @Column(name = "product_id")
    private Long productId;

    @Column(name = "test_method_id")
    private Long testMethodId;
}
