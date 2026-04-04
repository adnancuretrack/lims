-- =============================================================
-- V18__method_architect_audit.sql — Create Audit Tables
-- =============================================================

-- 1. Create Method Definitions Audit table
CREATE TABLE IF NOT EXISTS method_definitions_aud (
    id              BIGINT NOT NULL,
    rev             BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype         SMALLINT,
    test_method_id  BIGINT,
    version         INT,
    status          VARCHAR(30),
    schema_definition JSONB,
    report_template_path VARCHAR(255),
    PRIMARY KEY (id, rev)
);

-- 2. Create Worksheet Data Audit table
CREATE TABLE IF NOT EXISTS worksheet_data_aud (
    id                   BIGINT NOT NULL,
    rev                  BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype              SMALLINT,
    sample_test_id       BIGINT,
    method_definition_id BIGINT,
    data                 JSONB,
    calculated_results   JSONB,
    status               VARCHAR(30),
    PRIMARY KEY (id, rev)
);
