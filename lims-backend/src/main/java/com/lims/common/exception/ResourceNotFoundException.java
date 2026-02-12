package com.lims.common.exception;

/**
 * Thrown when a requested resource (sample, instrument, user, etc.) is not found.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String resourceType, Long id) {
        super(resourceType + " with ID " + id + " not found");
    }

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
