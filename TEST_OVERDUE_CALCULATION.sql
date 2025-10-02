-- Test if the overdue calculation matches what Edge Function should see
SELECT 
  c.id as cycle_id,
  c."configId",
  c."userId",
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
    END as grace_deadline,
  -- Is it overdue?
  CASE 
    WHEN NOW() > (c."nextCheckinAt" + 
      CASE 
        WHEN cfg."graceUnit" = 'minutes' THEN (cfg."graceDays" * INTERVAL '1 minute')
        WHEN cfg."graceUnit" = 'hours' THEN (cfg."graceDays" * INTERVAL '1 hour')
        ELSE (cfg."graceDays" * INTERVAL '1 day')
      END)
    THEN '🔴 YES - OVERDUE!'
    ELSE '🟢 No - not yet'
  END as is_overdue
FROM dms_cycles c
JOIN dms_configs cfg ON c."configId" = cfg.id
WHERE cfg.status = 'ACTIVE'
  AND c.state IN ('ACTIVE', 'GRACE', 'PENDING_RELEASE')
ORDER BY c."updatedAt" DESC;

