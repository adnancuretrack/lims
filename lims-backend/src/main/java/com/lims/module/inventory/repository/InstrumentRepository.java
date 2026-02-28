package com.lims.module.inventory.repository;

import com.lims.module.inventory.entity.Instrument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InstrumentRepository extends JpaRepository<Instrument, Long> {
    Optional<Instrument> findBySerialNumber(String serialNumber);
    List<Instrument> findByActiveTrue();
    List<Instrument> findByActiveTrueAndCalibrationDueDateBefore(LocalDate date);
    List<Instrument> findByStatus(String status);
}
