-- Documents and per-page analysis results

CREATE TABLE documents (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename    VARCHAR(255) NOT NULL,
    storage_key          VARCHAR(500) NOT NULL,
    mime_type            VARCHAR(120),
    file_extension       VARCHAR(10),
    file_size_bytes      BIGINT NOT NULL,
    checksum_sha256      VARCHAR(64),
    status               VARCHAR(15) NOT NULL DEFAULT 'UPLOADED'
                         CHECK (status IN ('UPLOADED','ANALYZED','ARCHIVED','DELETED')),
    analysis_status      VARCHAR(12) NOT NULL DEFAULT 'PENDING'
                         CHECK (analysis_status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
    page_count           INT CHECK (page_count >= 0),
    analysis_summary     JSONB,
    virus_scan_status    VARCHAR(15) NOT NULL DEFAULT 'SKIPPED'
                         CHECK (virus_scan_status IN ('PENDING','CLEAN','INFECTED','SKIPPED','FAILED')),
    uploaded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    analyzed_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE document_pages (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id           UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number           INT  NOT NULL CHECK (page_number > 0),
    orientation           VARCHAR(10) CHECK (orientation IN ('PORTRAIT','LANDSCAPE')),
    width_pt              NUMERIC(8,2),
    height_pt             NUMERIC(8,2),
    is_blank              BOOLEAN NOT NULL DEFAULT FALSE,
    blank_confidence      NUMERIC(4,3) CHECK (blank_confidence BETWEEN 0 AND 1),
    is_image_heavy        BOOLEAN NOT NULL DEFAULT FALSE,
    thumbnail_storage_key VARCHAR(500),
    UNIQUE (document_id, page_number)
);

CREATE INDEX idx_documents_customer ON documents(customer_id);
CREATE INDEX idx_documents_status   ON documents(status, analysis_status);
CREATE INDEX idx_doc_pages_doc      ON document_pages(document_id);

CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
