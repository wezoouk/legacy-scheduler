-- Check ALL DMS configs (including inactive)
SELECT 
  id,
  "userId",
  "frequencyDays",
  "graceDays",
  "graceUnit",
  "frequencyUnit",
  status,
  "createdAt",
  "updatedAt"
FROM dms_configs
ORDER BY "createdAt" DESC;

-- Check ALL DMS cycles
SELECT 
  cy.id,
  cy."configId",
  cy."nextCheckinAt",
  cy.state,
  cy."updatedAt",
  dc.status as "configStatus"
FROM dms_cycles cy
LEFT JOIN dms_configs dc ON cy."configId" = dc.id
ORDER BY cy."nextCheckinAt" DESC;

