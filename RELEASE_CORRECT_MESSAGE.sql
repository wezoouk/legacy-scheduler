-- Release the CORRECT DMS message
UPDATE messages 
SET 
  status = 'SCHEDULED',
  "scheduledFor" = NOW(),
  "updatedAt" = NOW()
WHERE id = '980c8216-13a9-483c-9372-e2cb39c325ef'  -- Correct message ID
  AND scope = 'DMS'
  AND status != 'SENT';

-- Verify it worked
SELECT 
  id,
  title,
  status,
  "scheduledFor",
  scope
FROM messages
WHERE id = '980c8216-13a9-483c-9372-e2cb39c325ef';

