-- Check DMS Configuration Status
-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check DMS Configs
SELECT 
  id,
  "userId",
  "frequencyDays",
  "frequencyUnit",
  "graceDays",
  "graceUnit",
  status,
  "createdAt",
  "updatedAt"
FROM dms_configs
ORDER BY "createdAt" DESC;

-- 2. Check DMS Cycles
SELECT 
  id,
  "configId",
  "userId",
  "nextCheckinAt",
  state,
  "updatedAt",
  -- Calculate if overdue
  CASE 
    WHEN "nextCheckinAt" < NOW() THEN 'OVERDUE'
    ELSE 'ON TIME'
  END as checkin_status
FROM dms_cycles
ORDER BY "updatedAt" DESC;

-- 3. Check DMS Protected Messages
SELECT 
  id,
  "userId",
  title,
  scope,
  status,
  "recipientIds",
  "createdAt"
FROM messages
WHERE scope = 'DMS'
ORDER BY "createdAt" DESC;

-- 4. Calculate actual grace deadline for active cycles
SELECT 
  c.id as cycle_id,
  c."nextCheckinAt",
  cfg."graceDays",
  cfg."graceUnit",
  c."nextCheckinAt" + 
    CASE 
      WHEN cfg."graceUnit" = 'minutes' THEN (cfg."graceDays" * INTERVAL '1 minute')
      WHEN cfg."graceUnit" = 'hours' THEN (cfg."graceDays" * INTERVAL '1 hour')
      ELSE (cfg."graceDays" * INTERVAL '1 day')
    END as grace_deadline,
  NOW() as current_time,
  CASE 
    WHEN NOW() > (c."nextCheckinAt" + 
      CASE 
        WHEN cfg."graceUnit" = 'minutes' THEN (cfg."graceDays" * INTERVAL '1 minute')
        WHEN cfg."graceUnit" = 'hours' THEN (cfg."graceDays" * INTERVAL '1 hour')
        ELSE (cfg."graceDays" * INTERVAL '1 day')
      END)
    THEN 'SHOULD RELEASE NOW'
    ELSE 'NOT YET OVERDUE'
  END as release_status
FROM dms_cycles c
JOIN dms_configs cfg ON c."configId" = cfg.id
WHERE c.state IN ('ACTIVE', 'GRACE', 'PENDING_RELEASE')
ORDER BY c."updatedAt" DESC;

