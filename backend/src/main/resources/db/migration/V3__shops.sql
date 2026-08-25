-- Shops (tenants), shopkeepers, operating hours, permissions

CREATE TABLE shopkeepers (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status     VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
               CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shops (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(150) NOT NULL,
    owner_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,   -- assigned shopkeeper
    address_line1  VARCHAR(200),
    address_line2  VARCHAR(200),
    city           VARCHAR(80),
    state          VARCHAR(80),
    pincode        VARCHAR(12),
    latitude       NUMERIC(9,6),
    longitude      NUMERIC(9,6),
    phone          VARCHAR(20),
    email          VARCHAR(180),
    status         VARCHAR(30) NOT NULL DEFAULT 'CLOSED'
                   CHECK (status IN ('OPEN','BUSY','TEMPORARILY_UNAVAILABLE','CLOSED','SUSPENDED')),
    supports_color BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE operating_hours (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    day_of_week INT  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),   -- 0=Sunday
    open_time   TIME NOT NULL,
    close_time  TIME NOT NULL,
    closed      BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (shop_id, day_of_week)
);

-- Fine-grained overrides of what a keeper may do inside their shop
CREATE TABLE shopkeeper_permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopkeeper_id   UUID NOT NULL REFERENCES shopkeepers(id) ON DELETE CASCADE,
    permission_code VARCHAR(60) NOT NULL,
    granted         BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (shopkeeper_id, permission_code)
);

CREATE INDEX idx_shops_status   ON shops(status);
CREATE INDEX idx_shops_owner    ON shops(owner_user_id);
CREATE INDEX idx_shops_city     ON shops(city);
CREATE INDEX idx_op_hours_shop  ON operating_hours(shop_id);

CREATE TRIGGER trg_shops_updated_at BEFORE UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_shopkeepers_updated_at BEFORE UPDATE ON shopkeepers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
