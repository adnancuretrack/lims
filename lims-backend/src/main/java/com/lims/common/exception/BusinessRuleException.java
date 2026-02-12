package com.lims.common.exception;

/**
 * Thrown when a business rule is violated.
 * Examples: duplicate sample, instrument overdue for calibration, result outside plausibility limits.
 */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}
