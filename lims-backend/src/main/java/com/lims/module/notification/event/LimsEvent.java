package com.lims.module.notification.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public abstract class LimsEvent extends ApplicationEvent {
    private final String title;
    private final String message;
    private final String type;
    private final Long userId;

    public LimsEvent(Object source, Long userId, String title, String message, String type) {
        super(source);
        this.userId = userId;
        this.title = title;
        this.message = message;
        this.type = type;
    }
}
