-- V30: Create user_clients mapping table and audit table

CREATE TABLE IF NOT EXISTS user_clients (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, client_id)
);

CREATE TABLE IF NOT EXISTS user_clients_aud (
    rev BIGINT NOT NULL REFERENCES revinfo(rev),
    revtype SMALLINT,
    user_id BIGINT NOT NULL,
    client_id BIGINT NOT NULL,
    PRIMARY KEY (rev, user_id, client_id)
);
