-- =============================================================
-- V5__analysis_review.sql — Normalized Analysis & Review Tables
-- =============================================================

-- Drop the preliminary simplified table from V2
DROP TABLE IF EXISTS test_results CASCADE;

-- 1. Sample Tests (Assignments)
-- Tracks which tests were assigned to which sample (and by whom/instrument)
CREATE TABLE sample_tests (
    id              BIGSERIAL    PRIMARY KEY,
    sample_id       BIGINT       NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    test_method_id  BIGINT       NOT NULL REFERENCES test_methods(id),
    status          VARCHAR(30)  NOT NULL DEFAULT 'PENDING',
    -- PENDING | IN_PROGRESS | COMPLETED | AUTHORIZED | REJECTED
    assigned_to     BIGINT       REFERENCES users(id),
    instrument_id   BIGINT,      -- Link to instruments (future-proofing)
    sort_order      INT          DEFAULT 0,
    is_retest       BOOLEAN      DEFAULT FALSE,
    parent_test_id  BIGINT       REFERENCES sample_tests(id), -- If this is a retest
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE(sample_id, test_method_id)
);

CREATE INDEX idx_sample_tests_sample ON sample_tests(sample_id);
CREATE INDEX idx_sample_tests_status ON sample_tests(status);

-- 2. Test Results (Actual Values)
-- Allows for multiple result entries if needed (e.g. history) 
-- though typically one active result per sample_test.
CREATE TABLE test_results (
    id              BIGSERIAL    PRIMARY KEY,
    sample_test_id  BIGINT       NOT NULL REFERENCES sample_tests(id) ON DELETE CASCADE,
    numeric_value   NUMERIC,
    text_value      TEXT,
    is_out_of_range BOOLEAN      DEFAULT FALSE,
    flag_color      VARCHAR(20), -- e.g. RED (OOS), YELLOW (Warning), GREEN (Pass)
    entered_by      BIGINT       REFERENCES users(id),
    entered_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_results_assignment ON test_results(sample_test_id);

-- 3. Result Reviews (Authorization Workflow)
-- Tracks the approval/rejection cycle for a result
CREATE TABLE result_reviews (
    id              BIGSERIAL    PRIMARY KEY,
    test_result_id  BIGINT       NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
    review_step     INT          NOT NULL DEFAULT 1, -- 1st Level, 2nd Level, etc.
    action          VARCHAR(20)  NOT NULL, -- AUTHORIZE | REJECT
    comment         TEXT,
    reviewer_id     BIGINT       NOT NULL REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_result ON result_reviews(test_result_id);

-- 4. Audit columns trigger update (optional since BaseEntity handles in code, 
-- but good practice in SQL if using triggers)
