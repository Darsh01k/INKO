-- Complaints, notifications, preferences, QR codes, audit, failed jobs, settings

CREATE TABLE complaints (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_number VARCHAR(30) NOT NULL UNIQUE,
    customer_id      UUID NOT NULL REFERENCES users(id),
    order_id         UUID REFERENCES orders(id) ON DELETE SET NULL,
    shop_id          UUID REFERENCES shops(id) ON DELETE SET NULL,
    category         VARCHAR(30) NOT NULL
                     CHECK (category IN ('WRONG_PRINT','MISSING_PAGES','POOR_QUALITY',
                                         'PAYMENT_ISSUE','REFUND_ISSUE','DELAY',
                                         'SHOP_BEHAVIOR','PRINTER_ISSUE','OTHER')),
    description      TEXT NOT NULL,
    attachments      JSONB NOT NULL DEFAULT '[]'::jsonb,
    status           VARCHAR(15) NOT NULL DEFAULT 'OPEN'
                     CHECK (status IN ('OPEN','ASSIGNED','INVESTIGATING','RESOLVED',
                                       'REJECTED','ESCALATED')),
    assigned_to      UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution       TEXT,
    internal_notes   JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE complaint_number_seq START 1;

CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         VARCHAR(40) NOT NULL,
    title        VARCHAR(200) NOT NULL,
    body         VARCHAR(1000),
    link_path    VARCHAR(300),
    is_read      BOOLEAN NOT NULL DEFAULT FALSE,
    read_at      TIMESTAMPTZ,
    channel      VARCHAR(10) NOT NULL DEFAULT 'IN_APP'
                 CHECK (channel IN ('IN_APP','EMAIL','SMS','PUSH')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_preferences (
    user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    in_app        BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    sms_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
    push_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    volume        INT NOT NULL DEFAULT 70 CHECK (volume BETWEEN 0 AND 100),
    language      VARCHAR(10) NOT NULL DEFAULT 'en'
);

CREATE TABLE qr_codes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id        UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    code_value     VARCHAR(64) NOT NULL UNIQUE,
    status         VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
                   CHECK (status IN ('ACTIVE','INACTIVE','EXPIRED','REPLACED')),
    replaced_by_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL,
    generated_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    activated_at   TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    expires_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE qr_scan_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_id      UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(300),
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only audit log (UPDATE/DELETE revoked from app role at end of this file)
CREATE TABLE audit_logs (
    id            BIGSERIAL PRIMARY KEY,
    actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role    VARCHAR(30),
    action        VARCHAR(60)  NOT NULL,
    resource_type VARCHAR(50)  NOT NULL,
    resource_id   VARCHAR(64),
    old_value     JSONB,
    new_value     JSONB,
    ip_address    VARCHAR(45),
    user_agent    VARCHAR(300),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE failed_jobs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID REFERENCES orders(id) ON DELETE SET NULL,
    printer_job_id UUID REFERENCES printer_jobs(id) ON DELETE SET NULL,
    printer_id     UUID REFERENCES printers(id) ON DELETE SET NULL,
    reason         VARCHAR(30) NOT NULL
                   CHECK (reason IN ('PRINTER_ERROR','PAPER_JAM','NO_PAPER','WRONG_PAPER_SIZE',
                                     'FILE_ISSUE','PRINTER_OFFLINE','CUSTOMER_CANCELLED',
                                     'SYSTEM_ERROR')),
    details        JSONB NOT NULL DEFAULT '{}'::jsonb,
    status         VARCHAR(12) NOT NULL DEFAULT 'OPEN'
                   CHECK (status IN ('OPEN','RETRIED','RESOLVED','CANCELLED')),
    retry_count    INT NOT NULL DEFAULT 0,
    internal_notes VARCHAR(500),
    resolved_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system_settings (
    setting_key   VARCHAR(80) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    description   VARCHAR(300),
    updated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complaints_status    ON complaints(status);
CREATE INDEX idx_complaints_customer  ON complaints(customer_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX idx_qr_shop              ON qr_codes(shop_id, status);
CREATE INDEX idx_audit_actor          ON audit_logs(actor_id);
CREATE INDEX idx_audit_resource       ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created        ON audit_logs(created_at);
CREATE INDEX idx_failed_jobs_status   ON failed_jobs(status);
CREATE INDEX idx_failed_jobs_order    ON failed_jobs(order_id);

CREATE TRIGGER trg_complaints_updated_at BEFORE UPDATE ON complaints
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_failed_jobs_updated_at BEFORE UPDATE ON failed_jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_qr_codes_updated_at BEFORE UPDATE ON qr_codes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit logs are append-only: block UPDATE and DELETE for the application role
REVOKE UPDATE, DELETE ON audit_logs FROM inko_app;
