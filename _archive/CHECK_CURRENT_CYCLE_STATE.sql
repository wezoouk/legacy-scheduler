-- Check the current state of the active cycle
SELECT 
  cy.id,
  cy."nextCheckinAt",
  cy.state,
  cy."updatedAt",
  dc."graceDays",
  dc."graceUnit",
  dc.status as config_status,
  -- Calculate grace deadline
  CASE 
    WHEN dc."graceUnit" = 'minutes' THEN 
      cy."nextCheckinAt" + (dc."graceDays" || ' minutes')::interval
    ELSE 
      cy."nextCheckinAt" + (dc."graceDays" || ' days')::interval
  END as grace_deadline,
  NOW() as current_time,
  -- Is it overdue?
  CASE 
    WHEN dc."graceUnit" = 'minutes' THEN 
      NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' minutes')::interval
    ELSE 
      NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' days')::interval
  END as is_overdue,
  -- Should Edge Function process it?
  (cy.state = 'ACTIVE' OR cy.state != 'PENDING_RELEASE') AND
  CASE 
    WHEN dc."graceUnit" = 'minutes' THEN 
      NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' minutes')::interval
    ELSE 
      NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' days')::interval
  END as should_be_processed
FROM dms_cycles cy
JOIN dms_configs dc ON cy."configId" = dc.id
WHERE dc.status = 'ACTIVE'
ORDER BY cy."updatedAt" DESC
LIMIT 1;

