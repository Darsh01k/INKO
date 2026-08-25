-- Orders, print configurations, order items

CREATE TABLE print_configurations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    color_mode          VARCHAR(6)  NOT NULL CHECK (color_mode IN ('BW','COLOR')),
    sides_mode          VARCHAR(7)  NOT NULL CHECK (sides_mode IN ('SINGLE','DOUBLE')),
    orientation         VARCHAR(10) NOT NULL DEFAULT 'AUTO'
                        CHECK (orientation IN ('PORTRAIT','LANDSCAPE','AUTO')),
    paper_size          VARCHAR(20) NOT NULL CHECK (paper_size IN ('A4','A3','A5','LETTER','LEGAL','OTHER')),
    paper_type_id       UUID REFERENCES paper_types(id) ON DELETE SET NULL,
    page_selection      VARCHAR(500) NOT NULL DEFAULT 'ALL',   -- 'ALL' or '1-5,8,10-12'
    selected_page_count INT NOT NULL CHECK (selected_page_count > 0),
    copies              INT NOT NULL DEFAULT 1 CHECK (copies BETWEEN 1 AND 999),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number       VARCHAR(30) NOT NULL UNIQUE,
    customer_id        UUID NOT NULL REFERENCES users(id),
    shop_id            UUID NOT NULL REFERENCES shops(id),
    status             VARCHAR(25) NOT NULL DEFAULT 'CREATED'
                       CHECK (status IN (
                           'CREATED','CONFIGURED','PAYMENT_PENDING','PAID','COD_SELECTED',
                           'TOKEN_GENERATED','QUEUED','ACCEPTED','PRINTING','COMPLETED',
                           'CANCELLED','FAILED','RETRY_PENDING',
                           'CANCELLATION_REQUESTED','REFUND_PENDING','REFUNDED')),
    total_pages        INT NOT NULL DEFAULT 0,
    copies             INT NOT NULL DEFAULT 1,
    subtotal           NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
    final_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
    pricing_snapshot   JSONB NOT NULL DEFAULT '{}'::jsonb,
    coupon_id          UUID REFERENCES coupons(id) ON DELETE SET NULL,
    cancellation_reason VARCHAR(500),
    cancelled_at       TIMESTAMPTZ,
    version            BIGINT NOT NULL DEFAULT 0,          -- optimistic locking
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id             UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    document_id          UUID NOT NULL REFERENCES documents(id),
    configuration_id     UUID NOT NULL REFERENCES print_configurations(id),
    page_count           INT  NOT NULL,
    copies               INT  NOT NULL,
    item_subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Human-friendly sequential order numbers: INKO-YYYY-NNNNNN
CREATE SEQUENCE order_number_seq START 1;

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_shop     ON orders(shop_id);
CREATE INDEX idx_orders_status   ON orders(status);
CREATE INDEX idx_orders_created  ON orders(created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_doc   ON order_items(document_id);

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
