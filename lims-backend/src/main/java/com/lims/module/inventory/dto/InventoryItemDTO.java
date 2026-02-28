package com.lims.module.inventory.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder
public class InventoryItemDTO {
    private Long id;
    private String name;
    private String code;
    private String category;
    private String lotNumber;
    private String supplier;
    private BigDecimal quantity;
    private String unit;
    private BigDecimal reorderLevel;
    private LocalDate expiryDate;
    private String storageLocation;
    private boolean active;
    private boolean expiringSoon;   // computed: expiryDate < 30 days from now
    private boolean lowStock;       // computed: quantity <= reorderLevel
}
