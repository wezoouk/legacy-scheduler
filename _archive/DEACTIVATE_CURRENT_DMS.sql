-- Manually deactivate the current DMS since messages were already released

UPDATE dms_configs
SET 
  status = 'INACTIVE',
  "updatedAt" = NOW()
WHERE status = 'ACTIVE'
RETURNING 
  id,
  status,
  "updatedAt";

