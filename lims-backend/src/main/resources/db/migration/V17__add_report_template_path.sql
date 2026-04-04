-- =============================================================
-- V17__add_report_template_path.sql — Excel Reporting Support
-- =============================================================

-- Add the report template path column to the main table
ALTER TABLE method_definitions 
ADD COLUMN report_template_path VARCHAR(255);

-- Ensure the audit table (Hibernate Envers) is also updated
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'method_definitions_aud' AND table_schema = 'public') THEN
        ALTER TABLE method_definitions_aud ADD COLUMN IF NOT EXISTS report_template_path VARCHAR(255);
    END IF;
END $$;
