-- Check current DMS config
SELECT 
  'Config' as type,
  dc.id,
  dc."frequencyDays",
  dc."frequencyUnit",
  dc."graceDays",
  dc."graceUnit",
  dc.status::text
FROM dms_configs dc
WHERE dc.status = 'ACTIVE';

-- Check current DMS cycle
SELECT 
  'Cycle' as type,
  cy.id,
  NULL::integer as "frequencyDays",
  NULL::text as "frequencyUnit",
  NULL::integer as "graceDays",
  NULL::text as "graceUnit",
  cy.state::text as status
FROM dms_cycles cy
JOIN dms_configs dc ON dc.id = cy."configId"
WHERE dc.status = 'ACTIVE';

-- Calculate grace deadline
SELECT 
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
  ) as calculated_grace_deadline,
  NOW() as current_time
FROM dms_cycles cy
JOIN dms_configs dc ON dc.id = cy."configId"
WHERE dc.status = 'ACTIVE';

