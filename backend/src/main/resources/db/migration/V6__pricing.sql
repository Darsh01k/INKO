-- Pricing rules, discount rules, coupons, redemptions

CREATE TABLE pricing_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope               VARCHAR(10) NOT NULL DEFAULT 'PLATFORM'
                        CHECK (scope IN ('PLATFORM','SHOP')),
    shop_id             UUID REFERENCES shops(id) ON DELETE CASCADE,
    paper_size          VARCHAR(20) NOT NULL CHECK (paper_size IN ('A4','A3','A5','LETTER','LEGAL','OTHER')),
    color_mode          VARCHAR(6)  NOT NULL CHECK (color_mode IN ('BW','COLOR')),
    sides_mode          VARCHAR(7)  NOT NULL CHECK (sides_mode IN ('SINGLE','DOUBLE')),
    price_per_page      NUMERIC(8,4) NOT NULL CHECK (price_per_page >= 0),
    special_paper_charge NUMERIC(8,4) NOT NULL DEFAULT 0,
    min_order_amount    NUMERIC(10,2),
    effective_from      DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to        DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pricing_rule UNIQUE (scope, shop_id, paper_size, color_mode, sides_mode, effective_from),
    CONSTRAINT ck_pricing_scope_shop CHECK (
        (scope = 'PLATFORM' AND shop_id IS NULL) OR (scope = 'SHOP' AND shop_id IS NOT NULL)
    )
);

CREATE TABLE discount_rules (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 VARCHAR(120) NOT NULL,
    scope                VARCHAR(10)  NOT NULL DEFAULT 'PLATFORM'
                         CHECK (scope IN ('PLATFORM','SHOP')),
    shop_id              UUID REFERENCES shops(id) ON DELETE CASCADE,
    type                 VARCHAR(12)  NOT NULL CHECK (type IN ('PERCENTAGE','FIXED')),
    value                NUMERIC(10,2) NOT NULL CHECK (value > 0),
    max_discount_amount  NUMERIC(10,2),
    min_order_amount     NUMERIC(10,2),
    min_pages            INT,
    starts_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at              TIMESTAMPTZ,
    usage_limit_total    INT,
    usage_limit_per_user INT,
    times_used           INT NOT NULL DEFAULT 0,
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_discount_scope_shop CHECK (
        (scope = 'PLATFORM' AND shop_id IS NULL) OR (scope = 'SHOP' AND shop_id IS NOT NULL)
    ),
    CONSTRAINT ck_discount_type_value CHECK (
        (type = 'PERCENTAGE' AND value <= 100) OR (type = 'FIXED')
    )
);

CREATE TABLE coupons (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discount_rule_id UUID NOT NULL UNIQUE REFERENCES discount_rules(id) ON DELETE CASCADE,
    code             VARCHAR(40) NOT NULL UNIQUE,
    valid_from       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to         TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coupon_redemptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id   UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id    UUID,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pricing_lookup ON pricing_rules(scope, shop_id, paper_size, color_mode, sides_mode, is_active);
CREATE INDEX idx_discounts_shop ON discount_rules(shop_id, is_active);
CREATE INDEX idx_redemptions_coupon_user ON coupon_redemptions(coupon_id, user_id);

CREATE TRIGGER trg_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_discount_rules_updated_at BEFORE UPDATE ON discount_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
