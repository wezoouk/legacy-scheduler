-- Complete DMS setup from scratch

-- Step 1: Reactivate the DMS config
UPDATE dms_configs
SET 
  status = 'ACTIVE',
  "frequencyDays" = 10,
  "graceDays" = 5,
  "graceUnit" = 'minutes',
  "frequencyUnit" = 'minutes',
  "updatedAt" = NOW()
WHERE "userId" = '69d26959-9119-4ca5-987b-f982344ae5be'
RETURNING id, status, "frequencyDays", "graceDays", "graceUnit";

-- Step 2: Create/update the cycle to be overdue NOW
UPDATE dms_cycles
SET 
  state = 'ACTIVE',
  "nextCheckinAt" = NOW() - INTERVAL '10 minutes', -- Already 10 minutes overdue
  "updatedAt" = NOW()
WHERE "configId" = (
  SELECT id FROM dms_configs WHERE "userId" = '69d26959-9119-4ca5-987b-f982344ae5be'
)
RETURNING id, "nextCheckinAt", state;

-- Step 3: Make sure the message is DRAFT
UPDATE messages
SET 
  status = 'DRAFT',
  scope = 'DMS',
  "scheduledFor" = NULL,
  "updatedAt" = NOW()
WHERE id = '1edba2e7-9a40-482e-9951-6bd03bba8250'
RETURNING id, title, status, scope;

-- Step 4: Verify everything is set up correctly
SELECT 
  'Verification' as info,
  dc.status as config_status,
  cy.state as cycle_state,
  cy."nextCheckinAt",
  cy."nextCheckinAt" + INTERVAL '5 minutes' as grace_deadline,
  NOW() as current_time,
  NOW() > cy."nextCheckinAt" + INTERVAL '5 minutes' as is_overdue,
  m.status as message_status,
  m.scope as message_scope
FROM dms_configs dc
JOIN dms_cycles cy ON cy."configId" = dc.id
CROSS JOIN messages m
WHERE dc."userId" = '69d26959-9119-4ca5-987b-f982344ae5be'
AND m.id = '1edba2e7-9a40-482e-9951-6bd03bba8250';

