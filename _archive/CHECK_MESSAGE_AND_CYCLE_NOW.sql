-- Check current status of the Image Test message
SELECT 
  'Message Status' as type,
  id,
  title,
  status,
  scope,
  "scheduledFor",
  "updatedAt"
FROM messages
WHERE id = '1edba2e7-9a40-482e-9951-6bd03bba8250';

-- Check current cycle state
SELECT 
  'Cycle State' as type,
  id,
  state,
  "nextCheckinAt",
  "updatedAt"
FROM dms_cycles
WHERE id = 'fd227c24-7523-4c70-894d-71b5cae7eb1e';

-- Check if cycle is overdue
SELECT 
  'Overdue Check' as type,
  cy."nextCheckinAt",
  dc."graceDays",
  dc."graceUnit",
  CASE 
    WHEN dc."graceUnit" = 'minutes' THEN 
      cy."nextCheckinAt" + (dc."graceDays" || ' minutes')::interval
    ELSE 
      cy."nextCheckinAt" + (dc."graceDays" || ' days')::interval
  END as grace_deadline,
  NOW() as current_time,
  CASE 
    WHEN dc."graceUnit" = 'minutes' THEN 
      NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' minutes')::interval
    ELSE 
      NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' days')::interval
  END as is_overdue,
  cy.state
FROM dms_cycles cy
JOIN dms_configs dc ON cy."configId" = dc.id
WHERE cy.id = 'fd227c24-7523-4c70-894d-71b5cae7eb1e';

