-- Test if the Edge Function can see DMS configs and cycles
-- This simulates what the Edge Function should be seeing

-- 1. Active DMS Configs
SELECT 
  '1. Active DMS Configs' as step,
  COUNT(*) as count
FROM dms_configs
WHERE status = 'ACTIVE';

-- 2. Cycles for Active Configs
SELECT 
  '2. DMS Cycles' as step,
  cy.id,
  cy."configId",
  cy."nextCheckinAt",
  cy.state,
  dc."graceDays",
  dc."graceUnit"
FROM dms_cycles cy
JOIN dms_configs dc ON dc.id = cy."configId"
WHERE dc.status = 'ACTIVE';

-- 3. Calculate if Overdue
SELECT 
  '3. Overdue Check' as step,
  cy.id as cycle_id,
  cy."nextCheckinAt",
  dc."graceDays",
  dc."graceUnit",
  cy."nextCheckinAt" + (
    CASE dc."graceUnit"
      WHEN 'minutes' THEN INTERVAL '1 minute' * dc."graceDays"
      WHEN 'hours' THEN INTERVAL '1 hour' * dc."graceDays"
      WHEN 'days' THEN INTERVAL '1 day' * dc."graceDays"
      ELSE INTERVAL '1 day' * dc."graceDays"
    END
  ) as grace_deadline,
  NOW() as current_time,
  cy.state,
  CASE
    WHEN NOW() > cy."nextCheckinAt" + (
      CASE dc."graceUnit"
        WHEN 'minutes' THEN INTERVAL '1 minute' * dc."graceDays"
        WHEN 'hours' THEN INTERVAL '1 hour' * dc."graceDays"
        WHEN 'days' THEN INTERVAL '1 day' * dc."graceDays"
        ELSE INTERVAL '1 day' * dc."graceDays"
      END
    ) AND cy.state != 'PENDING_RELEASE' THEN 'SHOULD RELEASE'
    ELSE 'NO ACTION'
  END as action_needed
FROM dms_cycles cy
JOIN dms_configs dc ON dc.id = cy."configId"
WHERE dc.status = 'ACTIVE';

-- 4. DMS Messages that would be released
SELECT 
  '4. DMS Messages (DRAFT)' as step,
  m.id,
  m.title,
  m.status,
  m."userId"
FROM messages m
JOIN dms_configs dc ON dc."userId" = m."userId"
WHERE 
  m.scope = 'DMS'
  AND m.status = 'DRAFT'
  AND dc.status = 'ACTIVE';

