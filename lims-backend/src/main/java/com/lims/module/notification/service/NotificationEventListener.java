package com.lims.module.notification.service;

import com.lims.module.notification.event.LimsEvent;
import com.lims.module.notification.event.SampleReceivedEvent;
import com.lims.module.notification.event.ResultAuthorizedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationService notificationService;

    @EventListener
    public void handleLimsEvent(LimsEvent event) {
        log.info("Handling LIMS event: {} for user ID: {}", event.getClass().getSimpleName(), event.getUserId());
        notificationService.sendNotification(
            event.getUserId(),
            event.getTitle(),
            event.getMessage(),
            event.getType()
        );
    }
}
