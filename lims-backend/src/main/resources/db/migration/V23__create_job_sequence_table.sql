CREATE TABLE system_sequences (
    id          BIGSERIAL PRIMARY KEY,
    prefix      VARCHAR(10)  NOT NULL,
    year        INT          NOT NULL,
    current_val BIGINT       NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (prefix, year)
);

-- Seed the initial row for 2026
INSERT INTO system_sequences (prefix, year, current_val)
VALUES ('JOB', 2026, 0);
