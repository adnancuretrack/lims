package com.lims.module.sample.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

public class SchemaValidatorTest {

    private SchemaValidator validator;

    @BeforeEach
    void setUp() {
        validator = new SchemaValidator();
    }

    @Test
    void testAllowCsvImport_ValidOnDataTableWithSpecimenData() {
        Map<String, Object> schema = new HashMap<>();
        schema.put("id", "schema-1");

        Map<String, Object> section = new HashMap<>();
        section.put("id", "sec-table");
        section.put("type", "DATA_TABLE");
        section.put("isSpecimenData", true);
        section.put("allowCsvImport", true);

        Map<String, Object> col = new HashMap<>();
        col.put("id", "col1");
        col.put("label", "Column 1");
        section.put("columns", List.of(col));

        schema.put("sections", List.of(section));

        assertDoesNotThrow(() -> validator.validateSchema(schema));
    }

    @Test
    void testAllowCsvImport_FailsOnSingleValueSection() {
        Map<String, Object> schema = new HashMap<>();
        schema.put("id", "schema-1");

        Map<String, Object> section = new HashMap<>();
        section.put("id", "sec-single");
        section.put("type", "SINGLE_VALUE");
        section.put("isSpecimenData", true);
        section.put("allowCsvImport", true);

        Map<String, Object> field = new HashMap<>();
        field.put("id", "f1");
        field.put("label", "Field 1");
        section.put("fields", List.of(field));

        schema.put("sections", List.of(section));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> validator.validateSchema(schema));
        assertTrue(ex.getMessage().contains("allowCsvImport is only allowed on DATA_TABLE or GROUPED_TABLE"));
    }

    @Test
    void testAllowCsvImport_FailsWhenSpecimenDataIsFalse() {
        Map<String, Object> schema = new HashMap<>();
        schema.put("id", "schema-1");

        Map<String, Object> section = new HashMap<>();
        section.put("id", "sec-table");
        section.put("type", "DATA_TABLE");
        section.put("isSpecimenData", false);
        section.put("allowCsvImport", true);

        Map<String, Object> col = new HashMap<>();
        col.put("id", "col1");
        col.put("label", "Column 1");
        section.put("columns", List.of(col));

        schema.put("sections", List.of(section));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> validator.validateSchema(schema));
        assertTrue(ex.getMessage().contains("allowCsvImport requires isSpecimenData to be true"));
    }
}
