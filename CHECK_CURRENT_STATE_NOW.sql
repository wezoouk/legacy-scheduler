-- Check current DMS state to see why it shows overdue

SELECT 
  'Config' as section,
  id,
  status,
  "frequencyDays",
  "frequencyUnit",
  "graceDays",
  "graceUnit"
FROM dms_configs
WHERE status = 'ACTIVE';

SELECT 
  'Cycle' as section,
  id,
  state,
  "nextCheckinAt",
  NOW() as current_time,
  "nextCheckinAt" > NOW() as is_future
FROM dms_cycles cy
JOIN dms_configs dc ON dc.id = cy."configId"
WHERE dc.status = 'ACTIVE';

-- Calculate if it's actually overdue
SELECT 
  'Overdue Check' as section,
  cy."nextCheckinAt",
  dc."graceDays",
  dc."graceUnit",
  cy."nextCheckinAt" + (
    CASE dc."graceUnit"
      WHEN 'minutes' THEN INTERVAL '1 minute' * dc."graceDays"
      WHEN 'hours' THEN INTERVAL '1 hour' * dc."graceDays"
      WHEN 'days' THEN INTERVAL '1 day' * dc."graceDays"
    END
  ) as grace_deadline,
  NOW() as current_time,
  NOW() > cy."nextCheckinAt" + (
    CASE dc."graceUnit"
      WHEN 'minutes' THEN INTERVAL '1 minute' * dc."graceDays"
      WHEN 'hours' THEN INTERVAL '1 hour' * dc."graceDays"
      WHEN 'days' THEN INTERVAL '1 day' * dc."graceDays"
    END
  ) as is_overdue
FROM dms_cycles cy
JOIN dms_configs dc ON dc.id = cy."configId"
WHERE dc.status = 'ACTIVE';

