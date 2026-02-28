package com.lims.module.inventory.service;

import com.lims.module.inventory.dto.CreateInventoryItemRequest;
import com.lims.module.inventory.dto.InventoryItemDTO;
import com.lims.module.inventory.entity.InventoryItem;
import com.lims.module.inventory.repository.InventoryItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryItemRepository repository;

    @Transactional(readOnly = true)
    public List<InventoryItemDTO> listAll() {
        return repository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InventoryItemDTO> listActive() {
        return repository.findByActiveTrue().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public InventoryItemDTO create(CreateInventoryItemRequest request) {
        if (repository.findByCode(request.getCode()).isPresent()) {
            throw new RuntimeException("Inventory item code already exists: " + request.getCode());
        }

        InventoryItem item = InventoryItem.builder()
                .name(request.getName())
                .code(request.getCode())
                .category(request.getCategory() != null ? request.getCategory() : "CHEMICAL")
                .lotNumber(request.getLotNumber())
                .supplier(request.getSupplier())
                .quantity(request.getQuantity() != null ? request.getQuantity() : BigDecimal.ZERO)
                .unit(request.getUnit() != null ? request.getUnit() : "mL")
                .reorderLevel(request.getReorderLevel() != null ? request.getReorderLevel() : BigDecimal.ZERO)
                .expiryDate(request.getExpiryDate())
                .storageLocation(request.getStorageLocation())
                .active(true)
                .build();

        return mapToDTO(repository.save(item));
    }

    @Transactional
    public InventoryItemDTO update(Long id, CreateInventoryItemRequest request) {
        InventoryItem item = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inventory item not found"));

        if (request.getName() != null) item.setName(request.getName());
        if (request.getCode() != null) item.setCode(request.getCode());
        if (request.getCategory() != null) item.setCategory(request.getCategory());
        if (request.getLotNumber() != null) item.setLotNumber(request.getLotNumber());
        if (request.getSupplier() != null) item.setSupplier(request.getSupplier());
        if (request.getQuantity() != null) item.setQuantity(request.getQuantity());
        if (request.getUnit() != null) item.setUnit(request.getUnit());
        if (request.getReorderLevel() != null) item.setReorderLevel(request.getReorderLevel());
        if (request.getExpiryDate() != null) item.setExpiryDate(request.getExpiryDate());
        if (request.getStorageLocation() != null) item.setStorageLocation(request.getStorageLocation());

        return mapToDTO(repository.save(item));
    }

    @Transactional
    public InventoryItemDTO adjustStock(Long id, BigDecimal adjustment) {
        InventoryItem item = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inventory item not found"));

        item.setQuantity(item.getQuantity().add(adjustment));
        return mapToDTO(repository.save(item));
    }

    @Transactional
    public void deactivate(Long id) {
        InventoryItem item = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inventory item not found"));
        item.setActive(false);
        repository.save(item);
    }

    private InventoryItemDTO mapToDTO(InventoryItem item) {
        LocalDate now = LocalDate.now();
        boolean expiringSoon = item.getExpiryDate() != null && item.getExpiryDate().isBefore(now.plusDays(30));
        boolean lowStock = item.getReorderLevel() != null && item.getQuantity().compareTo(item.getReorderLevel()) <= 0;

        return InventoryItemDTO.builder()
                .id(item.getId())
                .name(item.getName())
                .code(item.getCode())
                .category(item.getCategory())
                .lotNumber(item.getLotNumber())
                .supplier(item.getSupplier())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .reorderLevel(item.getReorderLevel())
                .expiryDate(item.getExpiryDate())
                .storageLocation(item.getStorageLocation())
                .active(item.isActive())
                .expiringSoon(expiringSoon)
                .lowStock(lowStock)
                .build();
    }
}
