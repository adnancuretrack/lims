-- Admin User (password: admin123)
INSERT INTO users (username, password_hash, display_name, email, is_active, auth_method, created_at, updated_at)
VALUES ('admin', '$2a$10$SgsoCBqDADTdE8TSYppGFeulVflXCsd./4oK95oxYSX6OAxB5KeDe', 'System Admin', 'admin@lims.com', true, 'LOCAL', NOW(), NOW());

-- Assign ADMIN role to admin user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'admin' AND r.name = 'ADMIN';
