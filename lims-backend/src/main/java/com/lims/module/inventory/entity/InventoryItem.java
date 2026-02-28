package com.lims.module.inventory.entity;

import com.lims.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.hibernate.envers.Audited;

@Entity
@Table(name = "inventory_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Audited
public class InventoryItem extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String category = "CHEMICAL"; // CHEMICAL, REAGENT, CONSUMABLE, STANDARD

    @Column(name = "lot_number", length = 100)
    private String lotNumber;

    @Column(length = 200)
    private String supplier;

    @Column(nullable = false, precision = 12, scale = 4)
    @Builder.Default
    private BigDecimal quantity = BigDecimal.ZERO;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String unit = "mL";

    @Column(name = "reorder_level", precision = 12, scale = 4)
    @Builder.Default
    private BigDecimal reorderLevel = BigDecimal.ZERO;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "storage_location", length = 100)
    private String storageLocation;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;
}
