-- V15: Drop obsolete code column from instruments table
-- The column was originally created in V2 but is no longer used by the JPA entity.
-- It has a NOT NULL constraint which causes registration to fail.

ALTER TABLE instruments DROP COLUMN IF EXISTS code;
ALTER TABLE instruments_aud DROP COLUMN IF EXISTS code;
