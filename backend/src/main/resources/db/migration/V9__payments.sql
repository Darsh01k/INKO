-- Payments, transactions, refunds, invoices

CREATE TABLE payments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id           UUID NOT NULL REFERENCES orders(id),
    amount             NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    method             VARCHAR(20) NOT NULL
                       CHECK (method IN ('MOCK_UPI','GATEWAY','COD')),
    provider           VARCHAR(30) NOT NULL DEFAULT 'MOCK',
    provider_order_ref VARCHAR(100),
    status             VARCHAR(22) NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING','AUTHORIZED','PAID','FAILED',
                                         'REFUNDED','PARTIALLY_REFUNDED','CANCELLED')),
    paid_at            TIMESTAMPTZ,
    idempotency_key    VARCHAR(80) UNIQUE,
    meta               JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_transactions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id         UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    txn_type           VARCHAR(10) NOT NULL CHECK (txn_type IN ('PAYMENT','REFUND')),
    gateway_txn_id     VARCHAR(120),
    amount             NUMERIC(12,2) NOT NULL,
    status             VARCHAR(12) NOT NULL DEFAULT 'INITIATED'
                       CHECK (status IN ('INITIATED','SUCCESS','FAILURE')),
    signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
    raw_payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refunds (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id           UUID NOT NULL REFERENCES payments(id),
    order_id             UUID NOT NULL REFERENCES orders(id),
    amount               NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    refund_type          VARCHAR(10) NOT NULL DEFAULT 'FULL'
                         CHECK (refund_type IN ('FULL','PARTIAL','MANUAL')),
    reason               VARCHAR(500),
    calculated_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    status               VARCHAR(12) NOT NULL DEFAULT 'REQUESTED'
                         CHECK (status IN ('REQUESTED','APPROVED','REJECTED',
                                           'INITIATED','COMPLETED','FAILED')),
    requested_by         UUID REFERENCES users(id),
    decided_by           UUID REFERENCES users(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoices (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id         UUID NOT NULL UNIQUE REFERENCES orders(id),
    invoice_number   VARCHAR(30) NOT NULL UNIQUE,
    total_amount     NUMERIC(12,2) NOT NULL,
    snapshot         JSONB NOT NULL DEFAULT '{}'::jsonb,
    pdf_storage_key  VARCHAR(500),
    issued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE invoice_number_seq START 1;

CREATE INDEX idx_payments_order      ON payments(order_id);
CREATE INDEX idx_payments_status     ON payments(status);
CREATE INDEX idx_refunds_payment     ON refunds(payment_id);
CREATE INDEX idx_refunds_status      ON refunds(status);
CREATE INDEX idx_ptx_payment         ON payment_transactions(payment_id);

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_refunds_updated_at BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
