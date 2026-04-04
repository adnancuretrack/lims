-- =============================================================
-- V16__method_architect_schema.sql — Dynamic Worksheet Tables
-- =============================================================

-- Add flag / reference to existing test_methods
ALTER TABLE test_methods ADD COLUMN has_worksheet BOOLEAN DEFAULT FALSE;
ALTER TABLE test_methods ADD COLUMN active_definition_id BIGINT; -- Added FK constraint later

-- 1. Method Definition (The Blueprint)
CREATE TABLE method_definitions (
    id              BIGSERIAL    PRIMARY KEY,
    test_method_id  BIGINT       NOT NULL REFERENCES test_methods(id),
    version         INT          NOT NULL DEFAULT 1,
    status          VARCHAR(30)  NOT NULL DEFAULT 'DRAFT',
        -- DRAFT | PUBLISHED | ARCHIVED
    schema_definition JSONB      NOT NULL,
    published_by    BIGINT       REFERENCES users(id),
    published_at    TIMESTAMPTZ,
    created_by      BIGINT       REFERENCES users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE(test_method_id, version)
);

-- Now we can add the FK constraint safely
ALTER TABLE test_methods
    ADD CONSTRAINT fk_test_methods_active_def
    FOREIGN KEY (active_definition_id) REFERENCES method_definitions(id);

-- 2. Worksheet Data (The Captured Inputs)
-- Note: it references sample_tests (the assignment), not test_results (the extracted numeric final value)
CREATE TABLE worksheet_data (
    id                   BIGSERIAL    PRIMARY KEY,
    sample_test_id       BIGINT       NOT NULL REFERENCES sample_tests(id) ON DELETE CASCADE,
    method_definition_id BIGINT       NOT NULL REFERENCES method_definitions(id),
    data                 JSONB        NOT NULL DEFAULT '{}'::jsonb,
    calculated_results   JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status               VARCHAR(30)  NOT NULL DEFAULT 'DRAFT',
        -- DRAFT | SUBMITTED | REVIEWED | FINALIZED
    submitted_by         BIGINT       REFERENCES users(id),
    submitted_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE(sample_test_id)
);

CREATE INDEX idx_method_def_test ON method_definitions(test_method_id);
CREATE INDEX idx_method_def_status ON method_definitions(status);
CREATE INDEX idx_worksheet_data_st ON worksheet_data(sample_test_id);
-- Enable JSONB advanced querying
CREATE INDEX idx_worksheet_data_jsonb ON worksheet_data USING gin (data);
