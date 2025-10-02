-- First, let's verify there ARE overdue DMS messages to process
SELECT 
  'Overdue Check' as test,
  cy.id as cycle_id,
  cy."nextCheckinAt",
  cy.state,
  dc."graceDays",
  dc."graceUnit",
  CASE 
    WHEN dc."graceUnit" = 'minutes' THEN 
      cy."nextCheckinAt" + (dc."graceDays" || ' minutes')::interval
    WHEN dc."graceUnit" = 'hours' THEN 
      cy."nextCheckinAt" + (dc."graceDays" || ' hours')::interval
    ELSE 
      cy."nextCheckinAt" + (dc."graceDays" || ' days')::interval
  END as grace_deadline,
  NOW() as current_time,
  CASE 
    WHEN dc."graceUnit" = 'minutes' THEN 
      NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' minutes')::interval
    WHEN dc."graceUnit" = 'hours' THEN 
      NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' hours')::interval
    ELSE 
      NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' days')::interval
  END as is_overdue,
  cy.state = 'ACTIVE' as is_active_state,
  -- Should release?
  (cy.state = 'ACTIVE' AND 
   CASE 
     WHEN dc."graceUnit" = 'minutes' THEN 
       NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' minutes')::interval
     WHEN dc."graceUnit" = 'hours' THEN 
       NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' hours')::interval
     ELSE 
       NOW() > cy."nextCheckinAt" + (dc."graceDays" || ' days')::interval
   END
  ) as should_release
FROM dms_cycles cy
JOIN dms_configs dc ON cy."configId" = dc.id
WHERE dc.status = 'ACTIVE'
ORDER BY cy."nextCheckinAt" DESC
LIMIT 1;

-- Check if there are DMS messages waiting
SELECT 
  'DMS Messages' as test,
  COUNT(*) as draft_dms_count
FROM messages
WHERE scope = 'DMS'
AND status = 'DRAFT';

