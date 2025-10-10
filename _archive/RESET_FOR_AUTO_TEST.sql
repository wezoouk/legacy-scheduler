-- Reset the system for testing automatic sending
-- This creates a fresh DMS setup that will be overdue in 2 minutes

-- Step 1: Reset the cycle back to ACTIVE and set next check-in to 1 minute from now
UPDATE dms_cycles
SET 
  state = 'ACTIVE',
  "nextCheckinAt" = NOW() + INTERVAL '1 minute',
  "updatedAt" = NOW()
WHERE id = 'fd227c24-7523-4c70-894d-71b5cae7eb1e'
RETURNING id, "nextCheckinAt", state;

-- Step 2: Reset the DMS message back to DRAFT
UPDATE messages
SET 
  status = 'DRAFT',
  "scheduledFor" = NULL,
  "updatedAt" = NOW()
WHERE id = '1edba2e7-9a40-482e-9951-6bd03bba8250'
RETURNING id, title, status, scope;

-- Step 3: Verify the config is still ACTIVE
SELECT 
  id,
  status,
  "graceDays",
  "graceUnit"
FROM dms_configs
WHERE id = '1e1c7071-78cc-483d-bdb7-720a2ad63f8b';

-- Step 4: Show when the message should be released
SELECT 
  'Expected Release Time' as info,
  NOW() + INTERVAL '1 minute' as "nextCheckinAt",
  NOW() + INTERVAL '1 minute' + INTERVAL '3 minutes' as "graceDeadline",
  'Message should be automatically released at this time' as note;

