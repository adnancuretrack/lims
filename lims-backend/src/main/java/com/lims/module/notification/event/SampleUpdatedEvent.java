package com.lims.module.notification.event;

public class SampleUpdatedEvent extends LimsEvent {
    public SampleUpdatedEvent(Object source, Long userId, String sampleNumber, String status) {
        super(source, userId, "Sample Updated: " + sampleNumber, 
              "Sample " + sampleNumber + " has been updated to status: " + status, 
              "SUCCESS");
    }
}
