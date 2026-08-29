-- V13: Harden production constraints + legacy status migration
-- 1. Enforce 1 payment per order (where business rule = one payment)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_payments_order_id') THEN
    ALTER TABLE payments ADD CONSTRAINT uq_payments_order_id UNIQUE (order_id);
  END IF;
END $$;
-- 2. Enforce 1 token per order (nullable order_id)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_tokens_order_id') THEN
    ALTER TABLE tokens ADD CONSTRAINT uq_tokens_order_id UNIQUE (order_id);
  END IF;
END $$;
-- 3. Enforce 1 queue entry per token already exists (uq_token_id) — verify
-- 4. Single ACTIVE QR per shop via partial unique index
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_qr_active_per_shop') THEN
    CREATE UNIQUE INDEX uq_qr_active_per_shop ON qr_codes (shop_id) WHERE status = 'ACTIVE';
  END IF;
END $$;
-- 5. Legacy status migration DONE->COMPLETED PROCESSING->PRINTING (must relax CHECK first)
DO $$ BEGIN
  ALTER TABLE queue_entries DROP CONSTRAINT IF EXISTS queue_entries_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE queue_entries DROP CONSTRAINT IF EXISTS queue_entries_status_chk;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
UPDATE queue_entries SET status = 'COMPLETED' WHERE status = 'DONE';
UPDATE queue_entries SET status = 'PRINTING' WHERE status = 'PROCESSING';
UPDATE queue_entries SET status = 'FAILED' WHERE status = 'REMOVED' AND token_id IN (SELECT id FROM tokens WHERE status = 'FAILED');
UPDATE queue_entries SET status = 'CANCELLED' WHERE status = 'REMOVED' AND status = 'REMOVED';
DO $$ BEGIN
  ALTER TABLE queue_entries ADD CONSTRAINT queue_entries_status_check CHECK (status IN ('WAITING','CALLED','PRINTING','COMPLETED','FAILED','CANCELLED'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- 6. Clamp audit size is app-level; no DB change
-- 7. Ensure order_number uniqueness already via V7
