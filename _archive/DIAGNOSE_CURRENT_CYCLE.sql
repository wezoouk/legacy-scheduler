-- Check the current active cycle and if it should be released
WITH active_cycle AS (
  SELECT 
    cy.*,
    dc."graceDays",
    dc."graceUnit"
  FROM dms_cycles cy
  JOIN dms_configs dc ON cy."configId" = dc.id
  WHERE cy.id = 'fd227c24-7523-4c70-894d-71b5cae7eb1e'
)
SELECT 
  id,
  "nextCheckinAt",
  state,
  "graceDays",
  "graceUnit",
  -- Calculate grace deadline
  CASE 
    WHEN "graceUnit" = 'minutes' THEN 
      "nextCheckinAt" + ("graceDays" || ' minutes')::interval
    WHEN "graceUnit" = 'hours' THEN 
      "nextCheckinAt" + ("graceDays" || ' hours')::interval
    ELSE 
      "nextCheckinAt" + ("graceDays" || ' days')::interval
  END as "graceDeadline",
  NOW() as "currentTime",
  -- Check if overdue
  CASE 
    WHEN "graceUnit" = 'minutes' THEN 
      NOW() > "nextCheckinAt" + ("graceDays" || ' minutes')::interval
    WHEN "graceUnit" = 'hours' THEN 
      NOW() > "nextCheckinAt" + ("graceDays" || ' hours')::interval
    ELSE 
      NOW() > "nextCheckinAt" + ("graceDays" || ' days')::interval
  END as "isOverdue",
  -- Time remaining
  CASE 
    WHEN "graceUnit" = 'minutes' THEN 
      "nextCheckinAt" + ("graceDays" || ' minutes')::interval - NOW()
    WHEN "graceUnit" = 'hours' THEN 
      "nextCheckinAt" + ("graceDays" || ' hours')::interval - NOW()
    ELSE 
      "nextCheckinAt" + ("graceDays" || ' days')::interval - NOW()
  END as "timeRemaining"
FROM active_cycle;

