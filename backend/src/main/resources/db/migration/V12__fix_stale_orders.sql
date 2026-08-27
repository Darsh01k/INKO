-- Fix orders stuck in QUEUED even though their token is already PRINTING/COMPLETED
UPDATE orders o SET status = 'PRINTING', updated_at = NOW()
WHERE o.status = 'QUEUED'
  AND EXISTS (SELECT 1 FROM tokens t WHERE t.order_id = o.id AND t.status = 'PRINTING');

UPDATE orders o SET status = 'COMPLETED', updated_at = NOW()
WHERE o.status IN ('QUEUED','PRINTING','ACCEPTED')
  AND EXISTS (SELECT 1 FROM tokens t WHERE t.order_id = o.id AND t.status = 'COMPLETED');
