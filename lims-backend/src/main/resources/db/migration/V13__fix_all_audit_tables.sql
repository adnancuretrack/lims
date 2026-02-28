-- V13: Comprehensive Audit Trail and Primary Schema Synchronization
-- This script fixes all identified gaps in primary and audit tables to ensure 100% parity with JPA entities.

DO $$ 
DECLARE 
    tbl TEXT;
BEGIN
    -- 0. Primary Table Fixes
    -- Create projects table (missing entirely from core migrations)
    CREATE TABLE IF NOT EXISTS projects (
        id              BIGSERIAL    PRIMARY KEY,
        project_number  VARCHAR(50)  NOT NULL UNIQUE,
        name            VARCHAR(200) NOT NULL,
        client_id       BIGINT       NOT NULL REFERENCES clients(id),
        location        VARCHAR(200),
        owner           VARCHAR(100),
        consultant      VARCHAR(100),
        contractor      VARCHAR(100),
        contact_person  VARCHAR(100),
        email           VARCHAR(100),
        phone           VARCHAR(50),
        is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
    );

    -- 1. Sequence and Envers Infrastructure Fixes
    -- Create revinfo_seq (needed for Hibernate 6)
    -- Hibernate default increment is 50 for pooled sequence optimizers.
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'revinfo_seq') THEN
        CREATE SEQUENCE revinfo_seq START WITH 1 INCREMENT BY 50;
    ELSE
        -- Ensure increment is 50 if it already exists
        ALTER SEQUENCE revinfo_seq INCREMENT BY 50;
    END IF;

    -- 2. Global Timestamp Standardization
    -- Add created_at and updated_at to ALL tables where they are missing (except internal flyway/revinfo)
    FOR tbl IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name NOT IN ('revinfo', 'flyway_schema_history')
    ) LOOP
        -- Add created_at if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'created_at') THEN
            EXECUTE 'ALTER TABLE ' || tbl || ' ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now()';
        END IF;
        -- Add updated_at if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'updated_at') THEN
            EXECUTE 'ALTER TABLE ' || tbl || ' ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now()';
        END IF;
    END LOOP;

    -- 3. Specific Functional Primary Column Fixes
    -- Fix inventory_items (missing columns in DB despite V6)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='expiry_date') THEN
        ALTER TABLE inventory_items ADD COLUMN expiry_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='supplier') THEN
        ALTER TABLE inventory_items ADD COLUMN supplier VARCHAR(200);
    END IF;

    -- Fix jobs (missing project_id)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='project_id') THEN
        ALTER TABLE jobs ADD COLUMN project_id BIGINT;
    END IF;


    -- 4. Audit Shadow Table Functional Fixes (Missing functional fields expected by Envers)

    -- Users Audit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users_aud' AND column_name='last_login_at') THEN
        ALTER TABLE users_aud ADD COLUMN last_login_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users_aud' AND column_name='password_hash') THEN
        ALTER TABLE users_aud ADD COLUMN password_hash VARCHAR(255);
    END IF;

    -- Samples Audit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='samples_aud' AND column_name='description') THEN
        ALTER TABLE samples_aud ADD COLUMN description VARCHAR(500);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='samples_aud' AND column_name='sampling_point') THEN
        ALTER TABLE samples_aud ADD COLUMN sampling_point VARCHAR(200);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='samples_aud' AND column_name='sampled_by') THEN
        ALTER TABLE samples_aud ADD COLUMN sampled_by VARCHAR(200);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='samples_aud' AND column_name='sampled_at') THEN
        ALTER TABLE samples_aud ADD COLUMN sampled_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='samples_aud' AND column_name='received_at') THEN
        ALTER TABLE samples_aud ADD COLUMN received_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='samples_aud' AND column_name='received_by') THEN
        ALTER TABLE samples_aud ADD COLUMN received_by BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='samples_aud' AND column_name='rejection_reason') THEN
        ALTER TABLE samples_aud ADD COLUMN rejection_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='samples_aud' AND column_name='due_date') THEN
        ALTER TABLE samples_aud ADD COLUMN due_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='samples_aud' AND column_name='assigned_to') THEN
        ALTER TABLE samples_aud ADD COLUMN assigned_to BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='samples_aud' AND column_name='department_id') THEN
        ALTER TABLE samples_aud ADD COLUMN department_id BIGINT;
    END IF;

    -- Inventory Items Audit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items_aud' AND column_name='supplier') THEN
        ALTER TABLE inventory_items_aud ADD COLUMN supplier VARCHAR(200);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items_aud' AND column_name='unit') THEN
        ALTER TABLE inventory_items_aud ADD COLUMN unit VARCHAR(30);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items_aud' AND column_name='expiry_date') THEN
        ALTER TABLE inventory_items_aud ADD COLUMN expiry_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items_aud' AND column_name='department_id') THEN
        ALTER TABLE inventory_items_aud ADD COLUMN department_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items_aud' AND column_name='current_stock') THEN
        ALTER TABLE inventory_items_aud ADD COLUMN current_stock NUMERIC(12,4);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items_aud' AND column_name='min_stock_level') THEN
        ALTER TABLE inventory_items_aud ADD COLUMN min_stock_level NUMERIC(12,4);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items_aud' AND column_name='manufacturer') THEN
        ALTER TABLE inventory_items_aud ADD COLUMN manufacturer VARCHAR(200);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items_aud' AND column_name='catalogue_number') THEN
        ALTER TABLE inventory_items_aud ADD COLUMN catalogue_number VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items_aud' AND column_name='storage_conditions') THEN
        ALTER TABLE inventory_items_aud ADD COLUMN storage_conditions TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items_aud' AND column_name='barcode') THEN
        ALTER TABLE inventory_items_aud ADD COLUMN barcode VARCHAR(50);
    END IF;

    -- Instruments Audit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments_aud' AND column_name='model') THEN
        ALTER TABLE instruments_aud ADD COLUMN model VARCHAR(200);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments_aud' AND column_name='manufacturer') THEN
        ALTER TABLE instruments_aud ADD COLUMN manufacturer VARCHAR(200);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments_aud' AND column_name='location') THEN
        ALTER TABLE instruments_aud ADD COLUMN location VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments_aud' AND column_name='department_id') THEN
        ALTER TABLE instruments_aud ADD COLUMN department_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments_aud' AND column_name='last_calibration_date') THEN
        ALTER TABLE instruments_aud ADD COLUMN last_calibration_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments_aud' AND column_name='next_calibration_date') THEN
        ALTER TABLE instruments_aud ADD COLUMN next_calibration_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments_aud' AND column_name='calibration_interval_days') THEN
        ALTER TABLE instruments_aud ADD COLUMN calibration_interval_days INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments_aud' AND column_name='connection_config') THEN
        ALTER TABLE instruments_aud ADD COLUMN connection_config TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments_aud' AND column_name='interface_type') THEN
        ALTER TABLE instruments_aud ADD COLUMN interface_type VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments_aud' AND column_name='code') THEN
        ALTER TABLE instruments_aud ADD COLUMN code VARCHAR(50);
    END IF;

    -- Test Methods Audit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_methods_aud' AND column_name='department_id') THEN
        ALTER TABLE test_methods_aud ADD COLUMN department_id BIGINT;
    END IF;

    -- Sample Tests Audit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sample_tests_aud' AND column_name='sort_order') THEN
        ALTER TABLE sample_tests_aud ADD COLUMN sort_order INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sample_tests_aud' AND column_name='is_retest') THEN
        ALTER TABLE sample_tests_aud ADD COLUMN is_retest BOOLEAN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sample_tests_aud' AND column_name='parent_test_id') THEN
        ALTER TABLE sample_tests_aud ADD COLUMN parent_test_id BIGINT;
    END IF;

    -- Test Results Audit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_results_aud' AND column_name='flag_color') THEN
        ALTER TABLE test_results_aud ADD COLUMN flag_color VARCHAR(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_results_aud' AND column_name='entered_at') THEN
        ALTER TABLE test_results_aud ADD COLUMN entered_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_results_aud' AND column_name='instrument_id') THEN
        ALTER TABLE test_results_aud ADD COLUMN instrument_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='test_results_aud' AND column_name='reagent_lot') THEN
        ALTER TABLE test_results_aud ADD COLUMN reagent_lot VARCHAR(200);
    END IF;

    -- Result Reviews Audit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='result_reviews_aud' AND column_name='reviewed_at') THEN
        ALTER TABLE result_reviews_aud ADD COLUMN reviewed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='result_reviews_aud' AND column_name='comment') THEN
        ALTER TABLE result_reviews_aud ADD COLUMN comment TEXT;
    END IF;

    -- Jobs Audit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs_aud' AND column_name='project_id') THEN
        ALTER TABLE jobs_aud ADD COLUMN project_id BIGINT;
    END IF;

    -- Notifications Audit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications_aud' AND column_name='link') THEN
        ALTER TABLE notifications_aud ADD COLUMN link VARCHAR(300);
    END IF;

END $$;
