-- V12: Sync inventory_items and instruments tables with current JPA model
-- These tables were partially created in V2 and skipped in V6 due to IF NOT EXISTS

-- 1. Fix Instruments Table
DO $$ 
BEGIN
    -- Rename 'code' to 'serial_number' if it exists and serial_number doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments' AND column_name='code') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments' AND column_name='serial_number') THEN
        ALTER TABLE instruments RENAME COLUMN code TO serial_number;
    END IF;

    -- Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments' AND column_name='serial_number') THEN
        ALTER TABLE instruments ADD COLUMN serial_number VARCHAR(100) UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments' AND column_name='calibration_due_date') THEN
        ALTER TABLE instruments ADD COLUMN calibration_due_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments' AND column_name='last_calibrated_at') THEN
        ALTER TABLE instruments ADD COLUMN last_calibrated_at DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments' AND column_name='calibrated_by') THEN
        ALTER TABLE instruments ADD COLUMN calibrated_by VARCHAR(200);
    END IF;

    -- Add to audit table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments_aud' AND column_name='calibration_due_date') THEN
        ALTER TABLE instruments_aud ADD COLUMN calibration_due_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments_aud' AND column_name='last_calibrated_at') THEN
        ALTER TABLE instruments_aud ADD COLUMN last_calibrated_at DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='instruments_aud' AND column_name='calibrated_by') THEN
        ALTER TABLE instruments_aud ADD COLUMN calibrated_by VARCHAR(200);
    END IF;
END $$;

-- 2. Fix Inventory Items Table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='lot_number') THEN
        ALTER TABLE inventory_items ADD COLUMN lot_number VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='reorder_level') THEN
        ALTER TABLE inventory_items ADD COLUMN reorder_level NUMERIC(12,4) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='storage_location') THEN
        ALTER TABLE inventory_items ADD COLUMN storage_location VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='quantity') THEN
        ALTER TABLE inventory_items ADD COLUMN quantity NUMERIC(12,4) DEFAULT 0;
    END IF;

    -- Add to audit table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items_aud' AND column_name='lot_number') THEN
        ALTER TABLE inventory_items_aud ADD COLUMN lot_number VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items_aud' AND column_name='reorder_level') THEN
        ALTER TABLE inventory_items_aud ADD COLUMN reorder_level NUMERIC(12,4) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items_aud' AND column_name='storage_location') THEN
        ALTER TABLE inventory_items_aud ADD COLUMN storage_location VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items_aud' AND column_name='quantity') THEN
        ALTER TABLE inventory_items_aud ADD COLUMN quantity NUMERIC(12,4) DEFAULT 0;
    END IF;
END $$;
