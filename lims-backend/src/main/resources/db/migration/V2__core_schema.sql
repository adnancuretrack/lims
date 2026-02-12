-- =============================================================
-- V2__core_schema.sql — Core LIMS Tables
-- =============================================================

-- ==================== Lookup / Reference Tables ====================

CREATE TABLE departments (
    id              BIGSERIAL    PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    code            VARCHAR(20)  NOT NULL UNIQUE,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE test_methods (
    id              BIGSERIAL    PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(50)  NOT NULL UNIQUE,
    standard_ref    VARCHAR(100),           -- e.g. ASTM C150, BS EN 197-1
    department_id   BIGINT       REFERENCES departments(id),
    result_type     VARCHAR(30)  NOT NULL DEFAULT 'QUANTITATIVE',
        -- QUANTITATIVE | PASS_FAIL | MENU | FREE_TEXT
    unit            VARCHAR(30),
    decimal_places  INT          DEFAULT 2,
    min_limit       NUMERIC,
    max_limit       NUMERIC,
    tat_hours       INT          DEFAULT 24, -- turnaround time
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id              BIGSERIAL    PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(50)  NOT NULL UNIQUE,
    category        VARCHAR(100),
    sampling_instructions TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Join table: which tests apply to which products
CREATE TABLE product_tests (
    product_id      BIGINT       NOT NULL REFERENCES products(id),
    test_method_id  BIGINT       NOT NULL REFERENCES test_methods(id),
    is_mandatory    BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order      INT          DEFAULT 0,
    PRIMARY KEY (product_id, test_method_id)
);

CREATE TABLE clients (
    id              BIGSERIAL    PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(50)  NOT NULL UNIQUE,
    contact_person  VARCHAR(200),
    email           VARCHAR(200),
    phone           VARCHAR(50),
    address         TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ==================== Users & Security ====================

CREATE TABLE users (
    id              BIGSERIAL    PRIMARY KEY,
    username        VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255),           -- null for LDAP-only users
    display_name    VARCHAR(200) NOT NULL,
    email           VARCHAR(200),
    department_id   BIGINT       REFERENCES departments(id),
    auth_method     VARCHAR(20)  NOT NULL DEFAULT 'LOCAL',
        -- LOCAL | LDAP
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE roles (
    id              BIGSERIAL    PRIMARY KEY,
    name            VARCHAR(50)  NOT NULL UNIQUE,
    description     VARCHAR(200)
);

CREATE TABLE user_roles (
    user_id         BIGINT       NOT NULL REFERENCES users(id),
    role_id         BIGINT       NOT NULL REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

-- ==================== Sample Lifecycle ====================

CREATE TABLE jobs (
    id              BIGSERIAL    PRIMARY KEY,
    job_number      VARCHAR(30)  NOT NULL UNIQUE,  -- auto-generated
    client_id       BIGINT       NOT NULL REFERENCES clients(id),
    project_name    VARCHAR(200),
    po_number       VARCHAR(50),
    priority        VARCHAR(20)  NOT NULL DEFAULT 'NORMAL',
        -- URGENT | HIGH | NORMAL | LOW
    status          VARCHAR(30)  NOT NULL DEFAULT 'DRAFT',
        -- DRAFT | SUBMITTED | IN_PROGRESS | COMPLETED | CANCELLED
    notes           TEXT,
    created_by      BIGINT       REFERENCES users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE samples (
    id              BIGSERIAL    PRIMARY KEY,
    sample_number   VARCHAR(30)  NOT NULL UNIQUE,  -- auto-generated
    job_id          BIGINT       NOT NULL REFERENCES jobs(id),
    product_id      BIGINT       NOT NULL REFERENCES products(id),
    description     VARCHAR(500),
    sampling_point  VARCHAR(200),
    sampled_by      VARCHAR(200),
    sampled_at      TIMESTAMPTZ,
    received_at     TIMESTAMPTZ,
    received_by     BIGINT       REFERENCES users(id),
    status          VARCHAR(30)  NOT NULL DEFAULT 'REGISTERED',
        -- REGISTERED | RECEIVED | IN_TESTING | REVIEWED | AUTHORIZED | REJECTED
    condition_on_receipt VARCHAR(20) DEFAULT 'ACCEPTABLE',
        -- ACCEPTABLE | DAMAGED | INSUFFICIENT
    rejection_reason TEXT,
    barcode         VARCHAR(50)  UNIQUE,
    due_date        TIMESTAMPTZ,
    department_id   BIGINT       REFERENCES departments(id),
    assigned_to     BIGINT       REFERENCES users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_samples_status ON samples(status);
CREATE INDEX idx_samples_job_id ON samples(job_id);
CREATE INDEX idx_samples_barcode ON samples(barcode);

-- ==================== Test Results ====================

CREATE TABLE test_results (
    id              BIGSERIAL    PRIMARY KEY,
    sample_id       BIGINT       NOT NULL REFERENCES samples(id),
    test_method_id  BIGINT       NOT NULL REFERENCES test_methods(id),
    -- Result values (one of these will be populated based on result_type)
    numeric_value   NUMERIC,
    text_value      VARCHAR(500),
    pass_fail       BOOLEAN,
    -- Metadata
    unit            VARCHAR(30),
    spec_min        NUMERIC,
    spec_max        NUMERIC,
    is_out_of_spec  BOOLEAN      DEFAULT FALSE,
    -- Workflow
    status          VARCHAR(30)  NOT NULL DEFAULT 'PENDING',
        -- PENDING | ENTERED | REVIEWED | AUTHORIZED | REJECTED
    entered_by      BIGINT       REFERENCES users(id),
    entered_at      TIMESTAMPTZ,
    reviewed_by     BIGINT       REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    authorized_by   BIGINT       REFERENCES users(id),
    authorized_at   TIMESTAMPTZ,
    rejection_reason TEXT,
    -- Instrument link
    instrument_id   BIGINT,  -- FK added after instruments table
    instrument_reading VARCHAR(200),
    notes           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE(sample_id, test_method_id)
);

CREATE INDEX idx_results_sample ON test_results(sample_id);
CREATE INDEX idx_results_status ON test_results(status);

-- ==================== Instruments ====================

CREATE TABLE instruments (
    id              BIGSERIAL    PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(50)  NOT NULL UNIQUE,
    serial_number   VARCHAR(100),
    manufacturer    VARCHAR(200),
    model           VARCHAR(200),
    department_id   BIGINT       REFERENCES departments(id),
    location        VARCHAR(200),
    status          VARCHAR(30)  NOT NULL DEFAULT 'ACTIVE',
        -- ACTIVE | UNDER_CALIBRATION | OUT_OF_SERVICE | RETIRED
    last_calibration_date  DATE,
    next_calibration_date  DATE,
    calibration_interval_days INT DEFAULT 365,
    -- Interface config (for future instrument integration)
    interface_type  VARCHAR(20),   -- RS232 | TCP | FILE | MANUAL
    connection_config JSONB,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Now add the FK for test_results -> instruments
ALTER TABLE test_results
    ADD CONSTRAINT fk_results_instrument
    FOREIGN KEY (instrument_id) REFERENCES instruments(id);

CREATE TABLE calibration_records (
    id              BIGSERIAL    PRIMARY KEY,
    instrument_id   BIGINT       NOT NULL REFERENCES instruments(id),
    calibration_date DATE        NOT NULL,
    next_due_date   DATE         NOT NULL,
    performed_by    VARCHAR(200),
    certificate_number VARCHAR(100),
    result          VARCHAR(20)  NOT NULL DEFAULT 'PASS',
        -- PASS | FAIL | CONDITIONAL
    notes           TEXT,
    document_path   VARCHAR(500),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ==================== Inventory / Reagents ====================

CREATE TABLE inventory_items (
    id              BIGSERIAL    PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(50)  NOT NULL UNIQUE,
    category        VARCHAR(50)  NOT NULL DEFAULT 'REAGENT',
        -- REAGENT | CONSUMABLE | STANDARD | GLASSWARE
    manufacturer    VARCHAR(200),
    catalogue_number VARCHAR(100),
    department_id   BIGINT       REFERENCES departments(id),
    unit            VARCHAR(30),
    current_stock   NUMERIC      NOT NULL DEFAULT 0,
    min_stock_level NUMERIC      DEFAULT 0,
    storage_location VARCHAR(200),
    storage_conditions VARCHAR(200),
    barcode         VARCHAR(50)  UNIQUE,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE inventory_lots (
    id              BIGSERIAL    PRIMARY KEY,
    item_id         BIGINT       NOT NULL REFERENCES inventory_items(id),
    lot_number      VARCHAR(100) NOT NULL,
    quantity        NUMERIC      NOT NULL,
    expiry_date     DATE,
    received_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
    supplier        VARCHAR(200),
    certificate_of_analysis VARCHAR(500),
    is_expired      BOOLEAN      DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_lots_expiry ON inventory_lots(expiry_date) WHERE NOT is_expired;

-- ==================== Quality Control (SQC) ====================

CREATE TABLE qc_charts (
    id              BIGSERIAL    PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    test_method_id  BIGINT       NOT NULL REFERENCES test_methods(id),
    instrument_id   BIGINT       REFERENCES instruments(id),
    chart_type      VARCHAR(30)  NOT NULL DEFAULT 'XBAR_R',
        -- XBAR_R | XBAR_S | INDIVIDUAL | CUSUM
    target_value    NUMERIC,
    ucl             NUMERIC,     -- upper control limit
    lcl             NUMERIC,     -- lower control limit
    usl             NUMERIC,     -- upper spec limit
    lsl             NUMERIC,     -- lower spec limit
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE qc_data_points (
    id              BIGSERIAL    PRIMARY KEY,
    chart_id        BIGINT       NOT NULL REFERENCES qc_charts(id),
    measured_value  NUMERIC      NOT NULL,
    measured_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    measured_by     BIGINT       REFERENCES users(id),
    lot_id          BIGINT       REFERENCES inventory_lots(id),
    is_violation    BOOLEAN      DEFAULT FALSE,
    violation_rule  VARCHAR(50),  -- e.g. "1-3s", "2-2s", "R-4s"
    notes           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ==================== Investigations / NCR ====================

CREATE TABLE investigations (
    id              BIGSERIAL    PRIMARY KEY,
    ncr_number      VARCHAR(30)  NOT NULL UNIQUE,  -- auto-generated
    title           VARCHAR(300) NOT NULL,
    type            VARCHAR(30)  NOT NULL DEFAULT 'NCR',
        -- NCR | CAPA | COMPLAINT | DEVIATION
    severity        VARCHAR(20)  NOT NULL DEFAULT 'MINOR',
        -- CRITICAL | MAJOR | MINOR
    status          VARCHAR(30)  NOT NULL DEFAULT 'OPEN',
        -- OPEN | INVESTIGATING | CORRECTIVE_ACTION | CLOSED
    description     TEXT         NOT NULL,
    root_cause      TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    related_sample_id BIGINT     REFERENCES samples(id),
    assigned_to     BIGINT       REFERENCES users(id),
    opened_by       BIGINT       NOT NULL REFERENCES users(id),
    opened_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    closed_by       BIGINT       REFERENCES users(id),
    closed_at       TIMESTAMPTZ,
    due_date        DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ==================== Documents ====================

CREATE TABLE documents (
    id              BIGSERIAL    PRIMARY KEY,
    title           VARCHAR(300) NOT NULL,
    doc_type        VARCHAR(30)  NOT NULL,
        -- SOP | MSDS | METHOD | TEMPLATE | CERTIFICATE | OTHER
    version         INT          NOT NULL DEFAULT 1,
    file_path       VARCHAR(500) NOT NULL,
    file_size       BIGINT,
    mime_type       VARCHAR(100),
    department_id   BIGINT       REFERENCES departments(id),
    uploaded_by     BIGINT       NOT NULL REFERENCES users(id),
    is_current      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ==================== Notifications ====================

CREATE TABLE notifications (
    id              BIGSERIAL    PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id),
    title           VARCHAR(200) NOT NULL,
    message         TEXT         NOT NULL,
    type            VARCHAR(30)  NOT NULL DEFAULT 'INFO',
        -- INFO | WARNING | ERROR | ACTION_REQUIRED
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    link            VARCHAR(300),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE NOT is_read;

-- ==================== Seed Data ====================

-- Default roles
INSERT INTO roles (name, description) VALUES
    ('ADMIN',       'System administrator — full access'),
    ('LAB_MANAGER', 'Laboratory manager — department-level admin'),
    ('ANALYST',     'Lab analyst — enters results'),
    ('REVIEWER',    'Technical reviewer — first-level review'),
    ('AUTHORIZER',  'Signatory — final authorization'),
    ('RECEPTIONIST','Sample reception — receives and logs samples'),
    ('VIEWER',      'Read-only access');

-- Default departments
INSERT INTO departments (name, code) VALUES
    ('Concrete & Cement',    'CC'),
    ('Soil & Aggregates',    'SA'),
    ('Asphalt & Bitumen',    'AB'),
    ('Chemical Analysis',    'CA'),
    ('Metals & Welding',     'MW'),
    ('Calibration',          'CAL');
