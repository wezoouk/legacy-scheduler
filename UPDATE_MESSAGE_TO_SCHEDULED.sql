-- Update the DMS message to SCHEDULED status with scheduledFor = now
-- This will make the Send button appear in the Messages tab

UPDATE messages
SET 
  status = 'SCHEDULED',
  "scheduledFor" = NOW()
WHERE 
  scope = 'DMS'
  AND status = 'DRAFT'
  AND title LIKE '%99%'
RETURNING 
  id,
  title,
  status,
  "scheduledFor",
  scope;


