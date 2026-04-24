-- V22: Compliance Documents Table
CREATE TABLE IF NOT EXISTS compliance_documents (
    id BIGSERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_path TEXT NOT NULL,
    file_size BIGINT,
    description VARCHAR(500),
    category VARCHAR(50),
    uploaded_by BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_documents_user FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Audit table for Compliance Documents
CREATE TABLE IF NOT EXISTS compliance_documents_aud (
    id BIGINT NOT NULL,
    rev BIGINT NOT NULL REFERENCES revinfo (rev),
    revtype SMALLINT,
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    file_path TEXT,
    file_size BIGINT,
    description VARCHAR(500),
    category VARCHAR(50),
    uploaded_by BIGINT,
    PRIMARY KEY (id, rev)
);

CREATE INDEX IF NOT EXISTS idx_compliance_docs_uploaded_by ON compliance_documents(uploaded_by);
