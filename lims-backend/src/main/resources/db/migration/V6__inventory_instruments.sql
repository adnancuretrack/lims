-- V6: Inventory Items and Instruments tables

-- Inventory Items (Chemicals, Reagents, Consumables)
CREATE TABLE IF NOT EXISTS inventory_items (
    id              BIGSERIAL       PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    code            VARCHAR(50)     NOT NULL UNIQUE,
    category        VARCHAR(50)     NOT NULL DEFAULT 'CHEMICAL',  -- CHEMICAL, REAGENT, CONSUMABLE, STANDARD
    lot_number      VARCHAR(100),
    supplier        VARCHAR(200),
    quantity         NUMERIC(12,4)  NOT NULL DEFAULT 0,
    unit            VARCHAR(30)     NOT NULL DEFAULT 'mL',
    reorder_level   NUMERIC(12,4)  DEFAULT 0,
    expiry_date     DATE,
    storage_location VARCHAR(100),
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Instruments (Lab Equipment)
CREATE TABLE IF NOT EXISTS instruments (
    id                      BIGSERIAL       PRIMARY KEY,
    name                    VARCHAR(200)    NOT NULL,
    serial_number           VARCHAR(100)    NOT NULL UNIQUE,
    model                   VARCHAR(200),
    manufacturer            VARCHAR(200),
    location                VARCHAR(100),
    status                  VARCHAR(30)     NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, MAINTENANCE, RETIRED
    calibration_due_date    DATE,
    last_calibrated_at      DATE,
    calibrated_by           VARCHAR(200),
    is_active               BOOLEAN         NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);
