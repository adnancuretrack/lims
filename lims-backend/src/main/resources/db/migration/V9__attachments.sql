-- V9: Attachments Table

CREATE TABLE IF NOT EXISTS attachments (
    id BIGSERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_path TEXT NOT NULL,
    file_size BIGINT,
    sample_id BIGINT,
    job_id BIGINT,
    uploaded_by BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attachments_sample FOREIGN KEY (sample_id) REFERENCES samples(id),
    CONSTRAINT fk_attachments_job FOREIGN KEY (job_id) REFERENCES jobs(id),
    CONSTRAINT fk_attachments_user FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_attachments_sample ON attachments(sample_id);
CREATE INDEX IF NOT EXISTS idx_attachments_job ON attachments(job_id);
