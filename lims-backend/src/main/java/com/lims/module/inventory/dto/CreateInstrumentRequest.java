package com.lims.module.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateInstrumentRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String serialNumber;
    private String model;
    private String manufacturer;
    private String location;
    private String status;
    private LocalDate calibrationDueDate;
    private LocalDate lastCalibratedAt;
    private String calibratedBy;
}
