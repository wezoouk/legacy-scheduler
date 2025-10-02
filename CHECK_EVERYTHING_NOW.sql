-- Check EVERYTHING to diagnose the issue

-- 1. Check DMS config
SELECT 
  'DMS Config' as type,
  id,
  "userId",
  status,
  "frequencyDays",
  "graceDays",
  "graceUnit",
  "frequencyUnit"
FROM dms_configs
WHERE status = 'ACTIVE';

-- 2. Check DMS cycle
SELECT 
  'DMS Cycle' as type,
  cy.id,
  cy."nextCheckinAt",
  cy.state,
  cy."updatedAt",
  NOW() as current_time,
  -- Calculate if overdue
  CASE 
    WHEN dc."graceUnit" = 'minutes' THEN 
      cy."nextCheckinAt" + (dc."graceDays" || ' minutes')::interval
    ELSE 
      cy."nextCheckinAt" + (dc."graceDays" || ' days')::interval
  END as grace_deadline,
  CASE 
    WHEN dc."graceUnit" = 'minutes' THEN 
      NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' minutes')::interval
    ELSE 
      NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' days')::interval
  END as is_overdue
FROM dms_cycles cy
JOIN dms_configs dc ON cy."configId" = dc.id
WHERE dc.status = 'ACTIVE'
ORDER BY cy."nextCheckinAt" DESC
LIMIT 1;

-- 3. Check DMS messages
SELECT 
  'DMS Messages' as type,
  id,
  title,
  status,
  scope,
  "scheduledFor",
  "createdAt"
FROM messages
WHERE scope = 'DMS'
ORDER BY "createdAt" DESC;

-- 4. Check if there are ANY messages ready to send
SELECT 
  'Scheduled Messages' as type,
  COUNT(*) as count
FROM messages
WHERE status = 'SCHEDULED'
AND "scheduledFor" <= NOW();

