package com.lims.module.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lims.module.notification.dto.AuditHistoryDTO;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.hibernate.envers.AuditReader;
import org.hibernate.envers.AuditReaderFactory;
import org.hibernate.envers.RevisionType;
import org.hibernate.envers.query.AuditEntity;
import com.lims.config.AuditRevisionEntity;
import com.lims.common.entity.BaseEntity;
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

    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<AuditHistoryDTO> getEntityHistory(Class<?> entityClass, Object id) {
        AuditReader reader = AuditReaderFactory.get(entityManager);
        
        // This is a simplified implementation. 
        // In a production app, you might want to join with a custom RevisionEntity to get usernames.
        // For now, we'll try to extract what we can.
        
        List<Number> revisions = reader.getRevisions(entityClass, id);
        List<AuditHistoryDTO> history = new ArrayList<>();

        for (Number rev : revisions) {
            Instant timestamp = null;
            String username = "SYSTEM";
            try {
                timestamp = reader.getRevisionDate(rev).toInstant();
                AuditRevisionEntity revisionEntity = reader.findRevision(AuditRevisionEntity.class, rev);
                if (revisionEntity != null && revisionEntity.getUsername() != null) {
                    username = revisionEntity.getUsername();
                }

                Object entityAtRev = reader.find(entityClass, id, rev);
                
                // Manually extract simple properties to avoid Jackson/Hibernate proxy issues
                java.util.Map<String, Object> dataMap = new java.util.HashMap<>();
                if (entityAtRev != null) {
                    Class<?> currentClass = entityClass;
                    while (currentClass != null && currentClass != Object.class) {
                        for (java.lang.reflect.Field field : currentClass.getDeclaredFields()) {
                            field.setAccessible(true);
                            // Skip collections, complex entities or very long strings
                            if (java.util.Collection.class.isAssignableFrom(field.getType())) continue;
                            if (BaseEntity.class.isAssignableFrom(field.getType())) continue;
                            
                            Object val = field.get(entityAtRev);
                            if (val != null) {
                                // Prevent overriding subclass fields with same name in superclass
                                dataMap.putIfAbsent(field.getName(), val.toString());
                            }
                        }
                        currentClass = currentClass.getSuperclass();
                    }
                }
                
                history.add(AuditHistoryDTO.builder()
                        .revisionNumber(rev.intValue())
                        .revisionTimestamp(timestamp)
                        .username(username) 
                        .entityData(dataMap)
                        .build());
            } catch (Exception e) {
                System.err.println("Audit retrieval failed for rev " + rev + ": " + e.getMessage());
                e.printStackTrace();
                history.add(AuditHistoryDTO.builder()
                        .revisionNumber(rev.intValue())
                        .revisionTimestamp(timestamp)
                        .username(username)
                        .action("Snapshot unavailable: " + e.getMessage())
                        .entityData(new java.util.HashMap<>())
                        .build());
            }
        }

        return history;
    }
}
