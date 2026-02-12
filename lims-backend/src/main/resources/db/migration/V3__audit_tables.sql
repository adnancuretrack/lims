-- =============================================================
-- V3__audit_tables.sql — Hibernate Envers Audit Infrastructure
-- =============================================================
-- Envers will auto-create _AUD tables on first run, but we need
-- the revinfo table to exist for our custom AuditRevisionEntity.
-- =============================================================

CREATE TABLE IF NOT EXISTS revinfo (
    rev             SERIAL       PRIMARY KEY,
    revtstmp        BIGINT       NOT NULL,
    username        VARCHAR(100) NOT NULL,
    change_reason   VARCHAR(500),
    ip_address      VARCHAR(45)
);
