package com.lims.module.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateInventoryItemRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String code;
    private String category;
    private String lotNumber;
    private String supplier;
    private BigDecimal quantity;
    private String unit;
    private BigDecimal reorderLevel;
    private LocalDate expiryDate;
    private String storageLocation;
}
