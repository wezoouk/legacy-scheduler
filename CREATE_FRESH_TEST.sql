-- Create a fresh DMS test that will be overdue in 2 minutes

-- Reset the cycle to be overdue in 2 minutes
UPDATE dms_cycles
SET 
  state = 'ACTIVE',
  "nextCheckinAt" = NOW() + INTERVAL '1 minute',
  "updatedAt" = NOW()
WHERE id = 'fd227c24-7523-4c70-894d-71b5cae7eb1e'
RETURNING id, "nextCheckinAt", state;

-- Reset the message to DRAFT
UPDATE messages
SET 
  status = 'DRAFT',
  "scheduledFor" = NULL,
  "updatedAt" = NOW()
WHERE id = '1edba2e7-9a40-482e-9951-6bd03bba8250'
RETURNING id, title, status;

-- Confirm setup
SELECT 
  'Will be overdue at:' as info,
  cy."nextCheckinAt" + INTERVAL '3 minutes' as overdue_time,
  NOW() as current_time
FROM dms_cycles cy
WHERE cy.id = 'fd227c24-7523-4c70-894d-71b5cae7eb1e';

