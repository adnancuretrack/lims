-- V7: Add traceability columns to test_results

ALTER TABLE test_results
ADD COLUMN instrument_id BIGINT,
ADD COLUMN reagent_lot VARCHAR(200);

ALTER TABLE test_results
ADD CONSTRAINT fk_test_results_instrument
FOREIGN KEY (instrument_id) REFERENCES instruments(id);
