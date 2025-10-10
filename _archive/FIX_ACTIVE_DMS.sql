-- Quick fix to create a DMS cycle for your active configuration
-- This will make the countdown appear

-- First, let's see what's in your dms_configs table
SELECT * FROM dms_configs WHERE status = 'ACTIVE';

-- If you see a row, note the ID, then run this (replace YOUR_CONFIG_ID with the actual ID):
/*
INSERT INTO dms_cycles (
  id,
  "configId",
  "userId",
  "nextCheckinAt",
  state,
  reminders,
  "checkInReminderSent",
  "updatedAt"
)
SELECT 
  gen_random_uuid(),
  id as "configId",
  "userId",
  NOW() + INTERVAL '5 minutes' as "nextCheckinAt",
  'ACTIVE' as state,
  '[1,3,7]'::jsonb as reminders,
  false as "checkInReminderSent",
  NOW() as "updatedAt"
FROM dms_configs
WHERE status = 'ACTIVE'
AND id NOT IN (SELECT "configId" FROM dms_cycles WHERE state = 'ACTIVE');
*/

-- After running, verify:
SELECT 
  c.id as config_id,
  c."userId",
  c."frequencyDays",
  c."frequencyUnit",
  cy.id as cycle_id,
  cy."nextCheckinAt",
  cy.state
FROM dms_configs c
LEFT JOIN dms_cycles cy ON c.id = cy."configId"
WHERE c.status = 'ACTIVE';

