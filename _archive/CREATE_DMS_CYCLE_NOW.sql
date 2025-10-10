-- This will create a DMS cycle for your active configuration
-- Run this in Supabase SQL Editor

-- Insert a new cycle for the active DMS config
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
  gen_random_uuid() as id,
  c.id as "configId",
  c."userId",
  CASE 
    WHEN c."frequencyUnit" = 'minutes' THEN NOW() + (c."frequencyDays" || ' minutes')::INTERVAL
    WHEN c."frequencyUnit" = 'hours' THEN NOW() + (c."frequencyDays" || ' hours')::INTERVAL
    ELSE NOW() + (c."frequencyDays" || ' days')::INTERVAL
  END as "nextCheckinAt",
  'ACTIVE' as state,
  '[1,3,7]'::jsonb as reminders,
  false as "checkInReminderSent",
  NOW() as "updatedAt"
FROM dms_configs c
WHERE c.status = 'ACTIVE'
AND c.id NOT IN (SELECT "configId" FROM dms_cycles WHERE state = 'ACTIVE')
ON CONFLICT DO NOTHING;

-- Verify it was created
SELECT 
  c.id as config_id,
  c."userId",
  c."frequencyDays",
  c."frequencyUnit",
  c."graceDays",
  c."graceUnit",
  cy.id as cycle_id,
  cy."nextCheckinAt",
  cy.state,
  (cy."nextCheckinAt" - NOW()) as time_until_checkin
FROM dms_configs c
LEFT JOIN dms_cycles cy ON c.id = cy."configId" AND cy.state = 'ACTIVE'
WHERE c.status = 'ACTIVE';

