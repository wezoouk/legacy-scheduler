-- Check current DMS configuration and cycle status
SELECT 
  'DMS Config' as type,
  dc.id,
  dc."userId",
  dc."frequencyDays",
  dc."graceDays",
  dc."graceUnit",
  dc.status,
  dc."createdAt",
  dc."updatedAt"
FROM dms_configs dc
WHERE dc.status = 'ACTIVE'
ORDER BY dc."createdAt" DESC;

-- Check latest DMS cycle
SELECT 
  'DMS Cycle' as type,
  cy.id,
  cy."configId",
  cy."nextCheckinAt",
  cy.state,
  cy."updatedAt",
  -- Calculate if overdue
  CASE 
    WHEN dc."graceUnit" = 'minutes' THEN 
      cy."nextCheckinAt" + (dc."graceDays" || ' minutes')::interval
    WHEN dc."graceUnit" = 'hours' THEN 
      cy."nextCheckinAt" + (dc."graceDays" || ' hours')::interval
    ELSE 
      cy."nextCheckinAt" + (dc."graceDays" || ' days')::interval
  END as "graceDeadline",
  NOW() as "currentTime",
  CASE 
    WHEN dc."graceUnit" = 'minutes' THEN 
      NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' minutes')::interval
    WHEN dc."graceUnit" = 'hours' THEN 
      NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' hours')::interval
    ELSE 
      NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' days')::interval
  END as "isOverdue"
FROM dms_cycles cy
JOIN dms_configs dc ON cy."configId" = dc.id
WHERE dc.status = 'ACTIVE'
ORDER BY cy."nextCheckinAt" DESC
LIMIT 1;

-- Check DMS messages
SELECT 
  'DMS Messages' as type,
  m.id,
  m.title,
  m.status,
  m.scope,
  m."userId",
  m."createdAt",
  m."scheduledFor"
FROM messages m
WHERE m.scope = 'DMS'
AND m.status != 'SENT'
ORDER BY m."createdAt" DESC;

