package com.lims.module.inventory.service;

import com.lims.module.inventory.dto.CreateInstrumentRequest;
import com.lims.module.inventory.dto.InstrumentDTO;
import com.lims.module.inventory.entity.Instrument;
import com.lims.module.inventory.repository.InstrumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InstrumentService {

    private final InstrumentRepository repository;

    @Transactional(readOnly = true)
    public List<InstrumentDTO> listAll() {
        return repository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InstrumentDTO> listActive() {
        return repository.findByActiveTrue().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public InstrumentDTO create(CreateInstrumentRequest request) {
        if (repository.findBySerialNumber(request.getSerialNumber()).isPresent()) {
            throw new RuntimeException("Instrument serial number already exists: " + request.getSerialNumber());
        }

        Instrument instrument = Instrument.builder()
                .name(request.getName())
                .serialNumber(request.getSerialNumber())
                .model(request.getModel())
                .manufacturer(request.getManufacturer())
                .location(request.getLocation())
                .status(request.getStatus() != null ? request.getStatus() : "ACTIVE")
                .calibrationDueDate(request.getCalibrationDueDate())
                .lastCalibratedAt(request.getLastCalibratedAt())
                .calibratedBy(request.getCalibratedBy())
                .active(true)
                .build();

        return mapToDTO(repository.save(instrument));
    }

    @Transactional
    public InstrumentDTO update(Long id, CreateInstrumentRequest request) {
        Instrument instrument = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Instrument not found"));

        if (request.getName() != null) instrument.setName(request.getName());
        if (request.getSerialNumber() != null) instrument.setSerialNumber(request.getSerialNumber());
        if (request.getModel() != null) instrument.setModel(request.getModel());
        if (request.getManufacturer() != null) instrument.setManufacturer(request.getManufacturer());
        if (request.getLocation() != null) instrument.setLocation(request.getLocation());
        if (request.getStatus() != null) instrument.setStatus(request.getStatus());
        if (request.getCalibrationDueDate() != null) instrument.setCalibrationDueDate(request.getCalibrationDueDate());
        if (request.getLastCalibratedAt() != null) instrument.setLastCalibratedAt(request.getLastCalibratedAt());
        if (request.getCalibratedBy() != null) instrument.setCalibratedBy(request.getCalibratedBy());

        return mapToDTO(repository.save(instrument));
    }

    @Transactional
    public InstrumentDTO updateCalibration(Long id, LocalDate nextCalibrationDate, String calibratedBy) {
        Instrument instrument = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Instrument not found"));

        instrument.setLastCalibratedAt(LocalDate.now());
        instrument.setCalibrationDueDate(nextCalibrationDate);
        instrument.setCalibratedBy(calibratedBy);
        instrument.setStatus("ACTIVE");

        return mapToDTO(repository.save(instrument));
    }

    @Transactional
    public void deactivate(Long id) {
        Instrument instrument = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Instrument not found"));
        instrument.setActive(false);
        instrument.setStatus("RETIRED");
        repository.save(instrument);
    }

    private InstrumentDTO mapToDTO(Instrument inst) {
        boolean overdue = inst.getCalibrationDueDate() != null && inst.getCalibrationDueDate().isBefore(LocalDate.now());

        return InstrumentDTO.builder()
                .id(inst.getId())
                .name(inst.getName())
                .serialNumber(inst.getSerialNumber())
                .model(inst.getModel())
                .manufacturer(inst.getManufacturer())
                .location(inst.getLocation())
                .status(inst.getStatus())
                .calibrationDueDate(inst.getCalibrationDueDate())
                .lastCalibratedAt(inst.getLastCalibratedAt())
                .calibratedBy(inst.getCalibratedBy())
                .active(inst.isActive())
                .calibrationOverdue(overdue)
                .build();
    }
}
