-- Fix the Image Test DMS message by creating/activating Guardian Angel config

-- Step 1: Create or reactivate DMS config for this user
INSERT INTO dms_configs (
  id,
  "userId",
  "frequencyDays",
  "graceDays",
  "graceUnit",
  "frequencyUnit",
  channels,
  status,
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '69d26959-9119-4ca5-987b-f982344ae5be',
  10, -- Check in every 10 minutes
  5,  -- Grace period of 5 minutes
  'minutes',
  'minutes',
  '["email"]'::jsonb,
  'ACTIVE',
  NOW(),
  NOW()
)
ON CONFLICT ("userId") 
DO UPDATE SET
  status = 'ACTIVE',
  "frequencyDays" = 10,
  "graceDays" = 5,
  "graceUnit" = 'minutes',
  "frequencyUnit" = 'minutes',
  "updatedAt" = NOW()
RETURNING *;

-- Step 2: Create a new DMS cycle (set check-in to 2 minutes from now for testing)
WITH active_config AS (
  SELECT id, "userId", "frequencyDays", "frequencyUnit"
  FROM dms_configs
  WHERE "userId" = '69d26959-9119-4ca5-987b-f982344ae5be'
  AND status = 'ACTIVE'
)
INSERT INTO dms_cycles (
  id,
  "configId",
  "userId",
  "nextCheckinAt",
  state,
  reminders,
  "checkInReminderSent",
  "lastReminderSent",
  "updatedAt"
)
SELECT 
  gen_random_uuid(),
  ac.id,
  ac."userId",
  NOW() + INTERVAL '2 minutes', -- Check-in in 2 minutes for testing
  'ACTIVE',
  '[1,3,7]'::jsonb,
  false,
  NULL,
  NOW()
FROM active_config ac
RETURNING *;

-- Step 3: Verify setup
SELECT 
  'Config' as type,
  dc.id,
  dc.status,
  dc."frequencyDays",
  dc."graceUnit"
FROM dms_configs dc
WHERE dc."userId" = '69d26959-9119-4ca5-987b-f982344ae5be';

SELECT 
  'Cycle' as type,
  cy.id,
  cy."nextCheckinAt",
  cy."nextCheckinAt" + INTERVAL '5 minutes' as "graceDeadline",
  cy.state,
  NOW() as "currentTime"
FROM dms_cycles cy
JOIN dms_configs dc ON cy."configId" = dc.id
WHERE dc."userId" = '69d26959-9119-4ca5-987b-f982344ae5be'
ORDER BY cy."nextCheckinAt" DESC
LIMIT 1;

