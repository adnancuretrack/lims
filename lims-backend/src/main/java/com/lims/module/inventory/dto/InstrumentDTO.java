package com.lims.module.inventory.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data @Builder
public class InstrumentDTO {
    private Long id;
    private String name;
    private String serialNumber;
    private String model;
    private String manufacturer;
    private String location;
    private String status;
    private LocalDate calibrationDueDate;
    private LocalDate lastCalibratedAt;
    private String calibratedBy;
    private boolean active;
    private boolean calibrationOverdue;  // computed: calibrationDueDate < today
}
