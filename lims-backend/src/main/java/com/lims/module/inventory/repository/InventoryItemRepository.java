package com.lims.module.inventory.repository;

import com.lims.module.inventory.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {
    Optional<InventoryItem> findByCode(String code);
    List<InventoryItem> findByActiveTrue();
    List<InventoryItem> findByActiveTrueAndExpiryDateBefore(LocalDate date);
    List<InventoryItem> findByCategory(String category);
}
