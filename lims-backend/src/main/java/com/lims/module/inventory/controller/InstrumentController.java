package com.lims.module.inventory.controller;

import com.lims.module.inventory.dto.CreateInstrumentRequest;
import com.lims.module.inventory.dto.InstrumentDTO;
import com.lims.module.inventory.service.InstrumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/instruments")
@RequiredArgsConstructor
@Tag(name = "Instruments", description = "Lab instrument and calibration management")
public class InstrumentController {

    private final InstrumentService instrumentService;

    @GetMapping
    @Operation(summary = "List all instruments")
    public ResponseEntity<List<InstrumentDTO>> list() {
        return ResponseEntity.ok(instrumentService.listAll());
    }

    @GetMapping("/active")
    @Operation(summary = "List active instruments")
    public ResponseEntity<List<InstrumentDTO>> listActive() {
        return ResponseEntity.ok(instrumentService.listActive());
    }

    @PostMapping
    @Operation(summary = "Register new instrument")
    public ResponseEntity<InstrumentDTO> create(@Valid @RequestBody CreateInstrumentRequest request) {
        return ResponseEntity.ok(instrumentService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update instrument details")
    public ResponseEntity<InstrumentDTO> update(@PathVariable Long id, @RequestBody CreateInstrumentRequest request) {
        return ResponseEntity.ok(instrumentService.update(id, request));
    }

    @PatchMapping("/{id}/calibrate")
    @Operation(summary = "Record calibration and set next due date")
    public ResponseEntity<InstrumentDTO> calibrate(@PathVariable Long id, @RequestBody Map<String, String> body) {
        LocalDate nextDue = LocalDate.parse(body.get("nextCalibrationDate"));
        String calibratedBy = body.getOrDefault("calibratedBy", "System");
        return ResponseEntity.ok(instrumentService.updateCalibration(id, nextDue, calibratedBy));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Retire an instrument")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        instrumentService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
