package com.lims.module.inventory.entity;

import com.lims.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

import org.hibernate.envers.Audited;

@Entity
@Table(name = "instruments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@Audited
public class Instrument extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "serial_number", nullable = false, unique = true, length = 100)
    private String serialNumber;

    @Column(length = 200)
    private String model;

    @Column(length = 200)
    private String manufacturer;

    @Column(length = 100)
    private String location;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, MAINTENANCE, RETIRED

    @Column(name = "calibration_due_date")
    private LocalDate calibrationDueDate;

    @Column(name = "last_calibrated_at")
    private LocalDate lastCalibratedAt;

    @Column(name = "calibrated_by", length = 200)
    private String calibratedBy;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;
}
