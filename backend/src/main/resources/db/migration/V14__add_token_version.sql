-- Add optimistic locking version for tokens (queue concurrency)
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
-- Ensure Shop latitude/longitude remain NUMERIC(9,6) (no change, Java type fixed to BigDecimal)
