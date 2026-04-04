package com.lims.module.sample.service;

import com.lims.module.sample.entity.WorksheetData;
import lombok.RequiredArgsConstructor;
import org.hibernate.envers.AuditReader;
import org.hibernate.envers.AuditReaderFactory;
import org.hibernate.envers.query.AuditEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorksheetAuditService {

    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRevisionHistory(Long sampleTestId) {
        AuditReader reader = AuditReaderFactory.get(entityManager);

        // Find the WorksheetData ID first
        List<Object[]> results = reader.createQuery()
            .forRevisionsOfEntity(WorksheetData.class, false, true)
            .add(AuditEntity.relatedId("sampleTest").eq(sampleTestId))
            .getResultList();

        return results.stream().map(result -> {
            WorksheetData entity = (WorksheetData) result[0];
            // result[1] is the DefaultRevisionEntity
            // result[2] is the RevisionType (ADD, MOD, DEL)
            
            return Map.of(
                "revision", result[1],
                "data", entity.getData(),
                "status", entity.getStatus(),
                "type", result[2].toString()
            );
        }).collect(Collectors.toList());
    }
}
