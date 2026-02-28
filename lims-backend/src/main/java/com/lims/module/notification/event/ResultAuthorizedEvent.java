package com.lims.module.notification.event;

public class ResultAuthorizedEvent extends LimsEvent {
    public ResultAuthorizedEvent(Object source, Long userId, String sampleNumber, String methodName) {
        super(source, userId, "Result Authorized", "Result for " + methodName + " on sample " + sampleNumber + " has been authorized.", "SUCCESS");
    }
}
