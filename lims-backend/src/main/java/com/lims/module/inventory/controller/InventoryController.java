package com.lims.module.inventory.controller;

import com.lims.module.inventory.dto.CreateInventoryItemRequest;
import com.lims.module.inventory.dto.InventoryItemDTO;
import com.lims.module.inventory.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@Tag(name = "Inventory", description = "Chemical and consumable inventory management")
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    @Operation(summary = "List all inventory items")
    public ResponseEntity<List<InventoryItemDTO>> list() {
        return ResponseEntity.ok(inventoryService.listAll());
    }

    @GetMapping("/active")
    @Operation(summary = "List active inventory items")
    public ResponseEntity<List<InventoryItemDTO>> listActive() {
        return ResponseEntity.ok(inventoryService.listActive());
    }

    @PostMapping
    @Operation(summary = "Create inventory item")
    public ResponseEntity<InventoryItemDTO> create(@Valid @RequestBody CreateInventoryItemRequest request) {
        return ResponseEntity.ok(inventoryService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update inventory item")
    public ResponseEntity<InventoryItemDTO> update(@PathVariable Long id, @RequestBody CreateInventoryItemRequest request) {
        return ResponseEntity.ok(inventoryService.update(id, request));
    }

    @PatchMapping("/{id}/adjust")
    @Operation(summary = "Adjust stock quantity (positive to add, negative to deduct)")
    public ResponseEntity<InventoryItemDTO> adjustStock(@PathVariable Long id, @RequestBody Map<String, BigDecimal> body) {
        BigDecimal adjustment = body.get("adjustment");
        if (adjustment == null) {
            throw new RuntimeException("adjustment field required");
        }
        return ResponseEntity.ok(inventoryService.adjustStock(id, adjustment));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Deactivate inventory item")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        inventoryService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
