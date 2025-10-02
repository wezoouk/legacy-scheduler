-- Check DMS Cycle with overdue calculation
SELECT 
  c.id,
  c."nextCheckinAt",
  c.state,
  NOW() as current_time,
  c."nextCheckinAt" + (cfg."graceDays" * INTERVAL '1 minute') as grace_deadline,
  CASE 
    WHEN NOW() > (c."nextCheckinAt" + (cfg."graceDays" * INTERVAL '1 minute'))
    THEN 'OVERDUE - SHOULD SEND NOW'
    ELSE 'NOT YET OVERDUE'
  END as overdue_status
FROM dms_cycles c
JOIN dms_configs cfg ON c."configId" = cfg.id
WHERE c."userId" = '69d26959-9119-4ca5-987b-f982344ae5be';

