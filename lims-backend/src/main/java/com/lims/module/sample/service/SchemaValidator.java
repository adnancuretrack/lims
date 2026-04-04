package com.lims.module.sample.service;

import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class SchemaValidator {

    /**
     * Validates the structure and references within a method definition schema.
     * @param schema The JSON deserialized into a Map
     * @throws IllegalArgumentException if validation fails
     */
    public void validateSchema(Map<String, Object> schema) {
        if (schema == null || schema.isEmpty()) {
            throw new IllegalArgumentException("Schema definition cannot be empty");
        }

        if (!schema.containsKey("sections")) {
            throw new IllegalArgumentException("Schema must contain a 'sections' array");
        }

        List<Map<String, Object>> sections = (List<Map<String, Object>>) schema.get("sections");
        if (sections == null || sections.isEmpty()) {
            throw new IllegalArgumentException("Schema must contain at least one section");
        }

        Set<String> allFieldIds = new HashSet<>();

        for (Map<String, Object> section : sections) {
            validateSection(section, allFieldIds);
        }

        // Additional overall validation logic could be evaluating formula syntax and ensuring
        // referenced fields exist in allFieldIds.
    }

    private void validateSection(Map<String, Object> section, Set<String> allFieldIds) {
        if (!section.containsKey("id") || section.get("id") == null) {
            throw new IllegalArgumentException("Every section must have an 'id'");
        }
        if (!section.containsKey("type") || section.get("type") == null) {
            throw new IllegalArgumentException("Section '" + section.get("id") + "' must have a 'type'");
        }

        String type = (String) section.get("type");

        switch (type) {
            case "SINGLE_VALUE":
            case "GROUPED_TABLE":
            case "DATA_TABLE":
                validateFields(section, allFieldIds);
                break;
            // Other types might not have an array strictly named "fields" or "columns"
            case "EQUIPMENT":
            case "SIGNATURE":
            case "NOTES":
            case "REFERENCE_TABLE":
            case "CHART":
                break;
            default:
                throw new IllegalArgumentException("Unknown section type: " + type);
        }
    }

    private void validateFields(Map<String, Object> section, Set<String> allFieldIds) {
        String arrayKey = "fields"; // default for SINGLE_VALUE
        if ("DATA_TABLE".equals(section.get("type"))) {
            arrayKey = "columns";
        } else if ("GROUPED_TABLE".equals(section.get("type"))) {
            arrayKey = "dataColumns";
        }

        if (section.containsKey(arrayKey)) {
            List<Map<String, Object>> fields = (List<Map<String, Object>>) section.get(arrayKey);
            for (Map<String, Object> field : fields) {
                if (!field.containsKey("id") || field.get("id") == null) {
                    throw new IllegalArgumentException("Field inside section '" + section.get("id") + "' is missing an 'id'");
                }
                String fieldId = (String) field.get("id");
                if (!allFieldIds.add(fieldId)) {
                    throw new IllegalArgumentException("Duplicate field id found: " + fieldId);
                }
            }
        }
    }
}
