package com.lims.module.notification.service;

import com.lims.module.notification.dto.AuditHistoryDTO;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.hibernate.envers.AuditReader;
import org.hibernate.envers.AuditReaderFactory;
import org.hibernate.envers.RevisionType;
import org.hibernate.envers.query.AuditEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditService {

    @PersistenceContext
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<AuditHistoryDTO> getEntityHistory(Class<?> entityClass, Object id) {
        AuditReader reader = AuditReaderFactory.get(entityManager);
        
        // This is a simplified implementation. 
        // In a production app, you might want to join with a custom RevisionEntity to get usernames.
        // For now, we'll try to extract what we can.
        
        List<Number> revisions = reader.getRevisions(entityClass, id);
        List<AuditHistoryDTO> history = new ArrayList<>();

        for (Number rev : revisions) {
            Object entityAtRev = reader.find(entityClass, id, rev);
            Instant timestamp = reader.getRevisionDate(rev).toInstant();
            
            // Note: Default Envers doesn't store 'action' easily without complex queries.
            // We'll estimate it or just provide the data snapshot.
            
            history.add(AuditHistoryDTO.builder()
                    .revisionNumber(rev.intValue())
                    .revisionTimestamp(timestamp)
                    .username("System") // Fallback if custom RevisionEntity is not yet wired
                    .entityData(entityAtRev)
                    .build());
        }

        return history;
    }
}
