-- Paper catalog, printers, shop paper inventory

CREATE TABLE paper_types (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(80)  NOT NULL,
    size       VARCHAR(20)  NOT NULL
               CHECK (size IN ('A4','A3','A5','LETTER','LEGAL','OTHER')),
    gsm        INT,
    category   VARCHAR(60),
    status     VARCHAR(12)  NOT NULL DEFAULT 'ACTIVE'
               CHECK (status IN ('ACTIVE','INACTIVE')),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (name, size, gsm)
);

CREATE TABLE printers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id             UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name                VARCHAR(120) NOT NULL,
    model               VARCHAR(120),
    status              VARCHAR(15) NOT NULL DEFAULT 'OFFLINE'
                        CHECK (status IN ('ONLINE','PRINTING','IDLE','OFFLINE','ERROR','MAINTENANCE')),
    color_capable       BOOLEAN NOT NULL DEFAULT FALSE,
    error_message       VARCHAR(500),
    last_heartbeat      TIMESTAMPTZ,
    maintenance_notes   VARCHAR(500),
    pages_printed_total BIGINT  NOT NULL DEFAULT 0,
    failure_count_30d   INT     NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE printer_paper_sizes (
    printer_id  UUID NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
    paper_size  VARCHAR(20) NOT NULL CHECK (paper_size IN ('A4','A3','A5','LETTER','LEGAL','OTHER')),
    PRIMARY KEY (printer_id, paper_size)
);

CREATE TABLE shop_paper_inventory (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id             UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    paper_size          VARCHAR(20) NOT NULL CHECK (paper_size IN ('A4','A3','A5','LETTER','LEGAL','OTHER')),
    paper_type_id       UUID REFERENCES paper_types(id) ON DELETE SET NULL,
    gsm                 INT,
    quantity_sheets     INT NOT NULL DEFAULT 0 CHECK (quantity_sheets >= 0),
    price_per_sheet     NUMERIC(8,4) NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 100,
    is_available        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shop_id, paper_size, gsm)
);

CREATE INDEX idx_printers_shop        ON printers(shop_id);
CREATE INDEX idx_printers_status      ON printers(status);
CREATE INDEX idx_inventory_shop_size  ON shop_paper_inventory(shop_id, paper_size);
CREATE INDEX idx_paper_types_status   ON paper_types(status);

CREATE TRIGGER trg_paper_types_updated_at BEFORE UPDATE ON paper_types
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_printers_updated_at BEFORE UPDATE ON printers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON shop_paper_inventory
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
