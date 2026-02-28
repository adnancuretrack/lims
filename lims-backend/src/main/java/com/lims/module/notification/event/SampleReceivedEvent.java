package com.lims.module.notification.event;

public class SampleReceivedEvent extends LimsEvent {
    public SampleReceivedEvent(Object source, Long userId, String sampleNumber) {
        super(source, userId, "Sample Received", "Sample " + sampleNumber + " has been received in the lab.", "INFO");
    }
}
