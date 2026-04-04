-- =============================================================
-- V19__fix_audit_columns.sql — Add missing audit fields
-- =============================================================

-- Add missing columns to method_definitions_aud
ALTER TABLE method_definitions_aud 
ADD COLUMN IF NOT EXISTS published_by BIGINT,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Add missing columns to worksheet_data_aud
ALTER TABLE worksheet_data_aud 
ADD COLUMN IF NOT EXISTS submitted_by BIGINT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
