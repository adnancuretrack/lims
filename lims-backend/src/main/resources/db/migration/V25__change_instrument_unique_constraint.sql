-- V25: Change instrument uniqueness constraint to composite key

-- 1. Drop the old unique constraint on serial_number
ALTER TABLE instruments DROP CONSTRAINT IF EXISTS instruments_serial_number_key;

-- 2. Update existing NULL values to empty strings to avoid constraint issues
UPDATE instruments SET manufacturer = '' WHERE manufacturer IS NULL;
UPDATE instruments SET model = '' WHERE model IS NULL;

-- 3. Set columns to NOT NULL with empty string defaults
ALTER TABLE instruments ALTER COLUMN manufacturer SET DEFAULT '';
ALTER TABLE instruments ALTER COLUMN manufacturer SET NOT NULL;
ALTER TABLE instruments ALTER COLUMN model SET DEFAULT '';
ALTER TABLE instruments ALTER COLUMN model SET NOT NULL;

-- 4. Add the new composite unique constraint
ALTER TABLE instruments ADD CONSTRAINT uq_instruments_composite UNIQUE (manufacturer, name, model, serial_number);
