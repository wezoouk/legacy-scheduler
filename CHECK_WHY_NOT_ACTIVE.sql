-- Check why Guardian Angel is not showing as active

-- 1. Check all DMS configs (active and inactive)
SELECT 
  'DMS Configs' as section,
  id,
  "userId",
  status,
  "frequencyDays",
  "frequencyUnit",
  "graceDays",
  "graceUnit",
  "createdAt",
  "updatedAt"
FROM dms_configs
ORDER BY "updatedAt" DESC;

-- 2. Check all DMS messages
SELECT 
  'DMS Messages' as section,
  id,
  title,
  status,
  scope,
  "createdAt"
FROM messages
WHERE scope = 'DMS'
ORDER BY "createdAt" DESC;

-- 3. Check all cycles
SELECT 
  'DMS Cycles' as section,
  cy.id,
  cy."configId",
  cy.state,
  cy."nextCheckinAt",
  dc.status as config_status
FROM dms_cycles cy
LEFT JOIN dms_configs dc ON dc.id = cy."configId"
ORDER BY cy."updatedAt" DESC;

