CREATE TABLE specimens (
    id              BIGSERIAL    PRIMARY KEY,
    sample_id       BIGINT       NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    specimen_number INT          NOT NULL,
    label           VARCHAR(100),
    scheduled_test_date DATE,
    status          VARCHAR(30)  NOT NULL DEFAULT 'DRAFT',
    tested_by       BIGINT       REFERENCES users(id),
    tested_at       TIMESTAMPTZ,
    authorized_by   BIGINT       REFERENCES users(id),
    authorized_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE(sample_id, specimen_number)
);

CREATE INDEX idx_specimens_sample ON specimens(sample_id);
CREATE INDEX idx_specimens_status ON specimens(status);

-- Add specimen FK to test_results
ALTER TABLE test_results ADD COLUMN specimen_id BIGINT REFERENCES specimens(id);
CREATE INDEX idx_results_specimen ON test_results(specimen_id);

-- Audit table for Hibernate Envers
CREATE TABLE specimens_aud (
    id              BIGINT       NOT NULL,
    rev             INT          NOT NULL REFERENCES revinfo(rev),
    revtype         SMALLINT,
    sample_id       BIGINT,
    specimen_number INT,
    label           VARCHAR(100),
    scheduled_test_date DATE,
    status          VARCHAR(30),
    tested_by       BIGINT,
    tested_at       TIMESTAMPTZ,
    authorized_by   BIGINT,
    authorized_at   TIMESTAMPTZ,
    PRIMARY KEY (id, rev)
);

CREATE TABLE coa_revisions (
    id              BIGSERIAL    PRIMARY KEY,
    sample_id       BIGINT       NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    revision_number INT          NOT NULL,
    is_interim      BOOLEAN      NOT NULL DEFAULT true,
    specimens_included INT       NOT NULL,
    specimens_total    INT       NOT NULL,
    pdf_snapshot    BYTEA        NOT NULL,
    generated_by    BIGINT       REFERENCES users(id),
    generated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    notes           TEXT,
    UNIQUE(sample_id, revision_number)
);

CREATE INDEX idx_coa_revisions_sample ON coa_revisions(sample_id);
