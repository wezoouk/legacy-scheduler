-- Check what happened after the Edge Function ran

-- 1. Check if DMS messages are now SCHEDULED or SENT
SELECT 
  'Messages' as type,
  id,
  title,
  status,
  "scheduledFor",
  scope
FROM messages
WHERE scope = 'DMS'
ORDER BY "updatedAt" DESC;

-- 2. Check cycle state
SELECT 
  'Cycle' as type,
  id,
  state,
  "nextCheckinAt",
  "updatedAt"
FROM dms_cycles cy
JOIN dms_configs dc ON dc.id = cy."configId"
WHERE dc.status = 'ACTIVE'
ORDER BY cy."updatedAt" DESC;

-- 3. Check config status
SELECT 
  'Config' as type,
  id,
  status,
  "frequencyDays",
  "frequencyUnit",
  "graceDays",
  "graceUnit"
FROM dms_configs
WHERE status = 'ACTIVE';

