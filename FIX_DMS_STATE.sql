-- Fix the DMS cycle state back to ACTIVE
UPDATE dms_cycles
SET 
  state = 'ACTIVE',
  "updatedAt" = NOW()
WHERE "userId" = '69d26959-9119-4ca5-987b-f982344ae5be';

-- Verify the fix
SELECT 
  c.id as cycle_id,
  c."nextCheckinAt",
  c.state,
  cfg."graceDays",
  cfg."graceUnit",
  NOW() as current_time,
  -- Calculate grace deadline
  c."nextCheckinAt" + 
    CASE 
      WHEN cfg."graceUnit" = 'minutes' THEN (cfg."graceDays" * INTERVAL '1 minute')
      WHEN cfg."graceUnit" = 'hours' THEN (cfg."graceDays" * INTERVAL '1 hour')
      ELSE (cfg."graceDays" * INTERVAL '1 day')
    END as grace_deadline
FROM dms_cycles c
JOIN dms_configs cfg ON c."configId" = cfg.id
WHERE c."userId" = '69d26959-9119-4ca5-987b-f982344ae5be';

