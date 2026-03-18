package com.lims.module.notification.service;

import com.lims.module.notification.dto.DataSyncEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataSyncService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast a data-change event to ALL connected clients via /topic/operations-sync.
     * This is separate from user-specific notifications.
     */
    public void broadcast(String entity, Long entityId, String action) {
        DataSyncEvent event = DataSyncEvent.builder()
                .entity(entity)
                .entityId(entityId)
                .action(action)
                .build();

        log.info("Broadcasting sync event: {} {} (ID: {})", action, entity, entityId);
        messagingTemplate.convertAndSend("/topic/operations-sync", event);
    }
}
