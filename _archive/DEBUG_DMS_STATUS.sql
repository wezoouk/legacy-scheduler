-- Complete DMS Status Check - See what's happening

-- 1. Check DMS Configs
SELECT 
  'DMS Configs' as section,
  id,
  "userId",
  status,
  "frequencyDays",
  "frequencyUnit",
  "graceDays",
  "graceUnit"
FROM dms_configs
WHERE status = 'ACTIVE';

-- 2. Check DMS Cycles
SELECT 
  'DMS Cycles' as section,
  cy.id,
  cy."configId",
  cy."nextCheckinAt",
  cy.state,
  NOW() as current_time,
  CASE
    WHEN cy."nextCheckinAt" IS NULL THEN 'NO CHECKIN SET'
    WHEN NOW() > cy."nextCheckinAt" THEN 'PAST CHECKIN TIME'
    ELSE 'FUTURE CHECKIN'
  END as checkin_status
FROM dms_cycles cy
ORDER BY cy."nextCheckinAt" DESC;

-- 3. Check DMS Messages
SELECT 
  'DMS Messages' as section,
  m.id,
  m.title,
  m.status,
  m."scheduledFor",
  m.scope,
  m."recipientIds"
FROM messages m
WHERE m.scope = 'DMS'
ORDER BY m."createdAt" DESC;

-- 4. Calculate Grace Deadline
SELECT 
  'Grace Deadline Calculation' as section,
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
  CASE
    WHEN NOW() > cy."nextCheckinAt" + (
      CASE dc."graceUnit"
        WHEN 'minutes' THEN INTERVAL '1 minute' * dc."graceDays"
        WHEN 'hours' THEN INTERVAL '1 hour' * dc."graceDays"
        WHEN 'days' THEN INTERVAL '1 day' * dc."graceDays"
        ELSE INTERVAL '1 day' * dc."graceDays"
      END
    ) THEN '🚨 OVERDUE - SHOULD RELEASE NOW'
    WHEN NOW() > cy."nextCheckinAt" THEN '⚠️ IN GRACE PERIOD'
    ELSE '✅ ACTIVE - NOT OVERDUE'
  END as status
FROM dms_cycles cy
JOIN dms_configs dc ON dc.id = cy."configId"
WHERE dc.status = 'ACTIVE'
ORDER BY cy."nextCheckinAt" DESC
LIMIT 1;

