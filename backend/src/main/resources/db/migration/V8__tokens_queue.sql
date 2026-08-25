-- Tokens, queue entries, printer jobs, token sequences

-- Atomic per-shop daily sequence for concurrency-safe token numbers
CREATE TABLE token_sequences (
    shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    seq_date    DATE NOT NULL,
    last_number INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (shop_id, seq_date)
);

CREATE TABLE tokens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id      UUID NOT NULL REFERENCES shops(id),
    order_id     UUID REFERENCES orders(id) ON DELETE SET NULL,   -- manual tokens may have no order
    token_number VARCHAR(10) NOT NULL,
    token_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    type         VARCHAR(8) NOT NULL DEFAULT 'NORMAL'
                 CHECK (type IN ('NORMAL','URGENT','MANUAL','LATE')),
    priority     INT NOT NULL DEFAULT 100,        -- lower = higher priority
    status       VARCHAR(12) NOT NULL DEFAULT 'GENERATED'
                 CHECK (status IN ('GENERATED','WAITING','CALLED','PRINTING','COMPLETED',
                                   'LATE','CANCELLED','FAILED')),
    issued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    called_at    TIMESTAMPTZ,
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shop_id, token_date, token_number)
);

CREATE TABLE queue_entries (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    token_id   UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    position   INT NOT NULL,
    status     VARCHAR(12) NOT NULL DEFAULT 'WAITING'
               CHECK (status IN ('WAITING','CALLED','PROCESSING','DONE','REMOVED')),
    queued_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (token_id)
);

CREATE TABLE printer_jobs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    printer_id     UUID NOT NULL REFERENCES printers(id),
    order_id       UUID REFERENCES orders(id) ON DELETE SET NULL,
    order_item_id  UUID REFERENCES order_items(id) ON DELETE SET NULL,
    status         VARCHAR(12) NOT NULL DEFAULT 'QUEUED'
                   CHECK (status IN ('QUEUED','PRINTING','PAUSED','COMPLETED','FAILED','CANCELLED')),
    failure_reason VARCHAR(500),
    retry_count    INT NOT NULL DEFAULT 0,
    notes          VARCHAR(500),
    queued_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tokens_shop_date_status ON tokens(shop_id, token_date, status);
CREATE INDEX idx_tokens_order            ON tokens(order_id);
CREATE INDEX idx_queue_shop_position     ON queue_entries(shop_id, status, position);
CREATE INDEX idx_printer_jobs_printer    ON printer_jobs(printer_id, status);
CREATE INDEX idx_printer_jobs_order      ON printer_jobs(order_id);

CREATE TRIGGER trg_tokens_updated_at BEFORE UPDATE ON tokens
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_queue_updated_at BEFORE UPDATE ON queue_entries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_printer_jobs_updated_at BEFORE UPDATE ON printer_jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
