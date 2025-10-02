-- Manually update the Image Test message to SCHEDULED so it can be sent
UPDATE messages
SET 
  status = 'SCHEDULED',
  "scheduledFor" = NOW() - INTERVAL '1 minute', -- Set to 1 minute ago to ensure it's picked up
  "updatedAt" = NOW()
WHERE id = '1edba2e7-9a40-482e-9951-6bd03bba8250'
RETURNING id, title, status, "scheduledFor", scope;

-- Also update the cycle to PENDING_RELEASE
UPDATE dms_cycles
SET 
  state = 'PENDING_RELEASE',
  "updatedAt" = NOW()
WHERE id = 'fd227c24-7523-4c70-894d-71b5cae7eb1e'
RETURNING id, state, "nextCheckinAt";

-- Verify the message is ready
SELECT 
  m.id,
  m.title,
  m.status,
  m."scheduledFor",
  m.scope,
  m."recipientIds",
  NOW() as current_time,
  m."scheduledFor" <= NOW() as should_send
FROM messages m
WHERE m.id = '1edba2e7-9a40-482e-9951-6bd03bba8250';

