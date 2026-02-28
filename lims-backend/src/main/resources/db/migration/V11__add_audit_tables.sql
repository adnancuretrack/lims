-- V11: Add missing audit tables for all audited entities
-- Required because spring.jpa.hibernate.ddl-auto is set to 'validate'

-- 1. Clients Audit
CREATE TABLE IF NOT EXISTS clients_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    name VARCHAR(200),
    code VARCHAR(50),
    contact_person VARCHAR(200),
    email VARCHAR(200),
    phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN,
    PRIMARY KEY (id, rev)
);

-- 2. Projects Audit
CREATE TABLE IF NOT EXISTS projects_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    project_number VARCHAR(50),
    name VARCHAR(200),
    client_id BIGINT,
    location VARCHAR(200),
    owner VARCHAR(100),
    consultant VARCHAR(100),
    contractor VARCHAR(100),
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(50),
    is_active BOOLEAN,
    PRIMARY KEY (id, rev)
);

-- 3. Users Audit
CREATE TABLE IF NOT EXISTS users_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    username VARCHAR(100),
    display_name VARCHAR(200),
    email VARCHAR(200),
    department_id BIGINT,
    auth_method VARCHAR(20),
    is_active BOOLEAN,
    PRIMARY KEY (id, rev)
);

-- 4. Roles Audit
CREATE TABLE IF NOT EXISTS roles_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    name VARCHAR(50),
    description VARCHAR(200),
    PRIMARY KEY (id, rev)
);

-- 5. Products Audit
CREATE TABLE IF NOT EXISTS products_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    name VARCHAR(200),
    code VARCHAR(50),
    category VARCHAR(100),
    sampling_instructions TEXT,
    is_active BOOLEAN,
    PRIMARY KEY (id, rev)
);

-- 6. Test Methods Audit
CREATE TABLE IF NOT EXISTS test_methods_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    name VARCHAR(200),
    code VARCHAR(50),
    standard_ref VARCHAR(100),
    result_type VARCHAR(30),
    unit VARCHAR(30),
    decimal_places INT,
    min_limit NUMERIC,
    max_limit NUMERIC,
    tat_hours INT,
    is_active BOOLEAN,
    PRIMARY KEY (id, rev)
);

-- 7. Jobs Audit
CREATE TABLE IF NOT EXISTS jobs_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    job_number VARCHAR(30),
    client_id BIGINT,
    project_name VARCHAR(200),
    po_number VARCHAR(50),
    priority VARCHAR(20),
    status VARCHAR(30),
    notes TEXT,
    created_by BIGINT,
    PRIMARY KEY (id, rev)
);

-- 8. Samples Audit
CREATE TABLE IF NOT EXISTS samples_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    sample_number VARCHAR(30),
    job_id BIGINT,
    product_id BIGINT,
    status VARCHAR(30),
    condition_on_receipt VARCHAR(20),
    barcode VARCHAR(50),
    PRIMARY KEY (id, rev)
);

-- 9. Sample Tests Audit
CREATE TABLE IF NOT EXISTS sample_tests_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    sample_id BIGINT,
    test_method_id BIGINT,
    status VARCHAR(30),
    assigned_to BIGINT,
    instrument_id BIGINT,
    PRIMARY KEY (id, rev)
);

-- 10. Test Results Audit
CREATE TABLE IF NOT EXISTS test_results_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    sample_test_id BIGINT,
    numeric_value NUMERIC,
    text_value TEXT,
    is_out_of_range BOOLEAN,
    entered_by BIGINT,
    PRIMARY KEY (id, rev)
);

-- 11. Result Reviews Audit
CREATE TABLE IF NOT EXISTS result_reviews_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    test_result_id BIGINT,
    review_step INT,
    action VARCHAR(20),
    reviewer_id BIGINT,
    PRIMARY KEY (id, rev)
);

-- 12. Instruments Audit
CREATE TABLE IF NOT EXISTS instruments_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    name VARCHAR(200),
    serial_number VARCHAR(100),
    status VARCHAR(30),
    is_active BOOLEAN,
    PRIMARY KEY (id, rev)
);

-- 13. Inventory Items Audit
CREATE TABLE IF NOT EXISTS inventory_items_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    name VARCHAR(200),
    code VARCHAR(50),
    category VARCHAR(50),
    is_active BOOLEAN,
    PRIMARY KEY (id, rev)
);

-- 14. User Roles Join Audit (Audited by Envers automatically usually, but let's check if needed)
-- Envers creates a special table for collections if audited.
CREATE TABLE IF NOT EXISTS user_roles_aud (
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    revtype SMALLINT,
    PRIMARY KEY (rev, user_id, role_id)
);

-- 15. Attachments Audit
CREATE TABLE IF NOT EXISTS attachments_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    file_path TEXT,
    file_size BIGINT,
    sample_id BIGINT,
    job_id BIGINT,
    uploaded_by BIGINT,
    PRIMARY KEY (id, rev)
);

-- 16. Notifications Audit
CREATE TABLE IF NOT EXISTS notifications_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    user_id BIGINT,
    title VARCHAR(200),
    message TEXT,
    type VARCHAR(50),
    is_read BOOLEAN,
    PRIMARY KEY (id, rev)
);
