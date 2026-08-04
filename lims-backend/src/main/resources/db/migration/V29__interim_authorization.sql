-- Add interim tracking fields to worksheet_data
ALTER TABLE worksheet_data ADD COLUMN is_interim_submission BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE worksheet_data ADD COLUMN submission_count INTEGER NOT NULL DEFAULT 0;

-- Audit table sync
ALTER TABLE worksheet_data_aud ADD COLUMN is_interim_submission BOOLEAN;
ALTER TABLE worksheet_data_aud ADD COLUMN submission_count INTEGER;
