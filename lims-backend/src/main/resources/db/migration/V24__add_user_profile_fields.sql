ALTER TABLE users ADD COLUMN phone VARCHAR(50);
ALTER TABLE users ADD COLUMN signature_image_path VARCHAR(500);

ALTER TABLE users_aud ADD COLUMN phone VARCHAR(50);
ALTER TABLE users_aud ADD COLUMN signature_image_path VARCHAR(500);
