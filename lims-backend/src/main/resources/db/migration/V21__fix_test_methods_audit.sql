-- =============================================================
-- V21__fix_test_methods_audit.sql — Test Method Audit Sync
-- =============================================================

-- Add the new Stage 5 columns to the existing audit table
ALTER TABLE test_methods_aud 
ADD COLUMN IF NOT EXISTS has_worksheet BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS active_definition_id BIGINT;
