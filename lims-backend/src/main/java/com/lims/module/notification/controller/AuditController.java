package com.lims.module.notification.controller;

import com.lims.module.notification.dto.AuditHistoryDTO;
import com.lims.module.notification.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
@Tag(name = "Audit", description = "Endpoints for retrieving entity revision history")
public class AuditController {

    private final AuditService auditService;

    @GetMapping("/{type}/{id}")
    @Operation(summary = "Get revision history for an entity")
    public ResponseEntity<List<AuditHistoryDTO>> getHistory(
            @PathVariable String type,
            @PathVariable Long id) {
        
        Class<?> entityClass = resolveEntityClass(type);
        if (entityClass == null) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(auditService.getEntityHistory(entityClass, id));
    }

    private Class<?> resolveEntityClass(String type) {
        return switch (type.toLowerCase()) {
            case "sample" -> com.lims.module.sample.entity.Sample.class;
            case "job" -> com.lims.module.sample.entity.Job.class;
            case "testresult" -> com.lims.module.sample.entity.TestResult.class;
            case "instrument" -> com.lims.module.inventory.entity.Instrument.class;
            case "inventory" -> com.lims.module.inventory.entity.InventoryItem.class;
            default -> null;
        };
    }
}
