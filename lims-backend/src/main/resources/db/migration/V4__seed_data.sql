-- Clients
INSERT INTO clients (name, code, contact_person, email, created_at, updated_at, is_active) VALUES
('Saudi Aramco', 'ARAMCO', 'John Doe', 'john.doe@aramco.com', NOW(), NOW(), true),
('SABIC', 'SABIC', 'Jane Smith', 'jane.smith@sabic.com', NOW(), NOW(), true),
('Maaden', 'MAADEN', 'Ahmed Ali', 'ahmed@maaden.com', NOW(), NOW(), true);

-- Products
INSERT INTO products (name, code, category, is_active, created_at, updated_at) VALUES
('Diesel Fuel', 'DIE-001', 'Fuel', true, NOW(), NOW()),
('Crude Oil', 'CRU-001', 'Petroleum', true, NOW(), NOW()),
('Drinking Water', 'WAT-001', 'Water', true, NOW(), NOW());

-- Test Methods
INSERT INTO test_methods (name, code, result_type, unit, decimal_places, tat_hours, is_active, created_at, updated_at) VALUES
('Density @ 15C', 'ASTM-D4052', 'QUANTITATIVE', 'kg/m3', 2, 24, true, NOW(), NOW()),
('Sulfur Content', 'ASTM-D4294', 'QUANTITATIVE', 'wt%', 3, 24, true, NOW(), NOW()),
('Appearance', 'VISUAL', 'QUALITATIVE', NULL, 0, 4, true, NOW(), NOW()),
('pH Value', 'ASTM-D1293', 'QUANTITATIVE', NULL, 1, 4, true, NOW(), NOW());

-- Product Tests (Default tests)
-- Diesel: Density, Sulfur, Appearance
INSERT INTO product_tests (product_id, test_method_id, is_mandatory, sort_order)
SELECT p.id, t.id, true, 1 FROM products p, test_methods t WHERE p.code='DIE-001' AND t.code='ASTM-D4052';

INSERT INTO product_tests (product_id, test_method_id, is_mandatory, sort_order)
SELECT p.id, t.id, true, 2 FROM products p, test_methods t WHERE p.code='DIE-001' AND t.code='ASTM-D4294';

INSERT INTO product_tests (product_id, test_method_id, is_mandatory, sort_order)
SELECT p.id, t.id, true, 3 FROM products p, test_methods t WHERE p.code='DIE-001' AND t.code='VISUAL';

-- Water: pH
INSERT INTO product_tests (product_id, test_method_id, is_mandatory, sort_order)
SELECT p.id, t.id, true, 1 FROM products p, test_methods t WHERE p.code='WAT-001' AND t.code='ASTM-D1293';
