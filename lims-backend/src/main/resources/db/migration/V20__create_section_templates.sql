-- =============================================================
-- V20__create_section_templates.sql — Administrative Library
-- =============================================================

-- Create the section templates table for the reusable library
CREATE TABLE IF NOT EXISTS section_templates (
    id              BIGSERIAL    PRIMARY KEY,
    name            VARCHAR(255) NOT NULL UNIQUE,
    description     TEXT,
    category        VARCHAR(100) NOT NULL,
    schema_definition JSONB      NOT NULL,
    created_by      VARCHAR(100),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Index for faster filtering by category in the palette
CREATE INDEX idx_section_templates_category ON section_templates(category);
