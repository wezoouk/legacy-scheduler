-- COMPLETE DMS DEBUG - Run this to see everything
-- Copy and paste into Supabase SQL Editor

-- 1. Your DMS Config
SELECT 
  'DMS CONFIG' as section,
  id,
  "userId",
  "frequencyDays" || ' ' || COALESCE("frequencyUnit", 'days') as frequency,
  "graceDays" || ' ' || COALESCE("graceUnit", 'days') as grace_period,
  status,
  "createdAt"
FROM dms_configs
ORDER BY "createdAt" DESC
LIMIT 5;

-- 2. Your DMS Cycle (with overdue calculation)
SELECT 
  'DMS CYCLE' as section,
  c.id,
  c."userId",
  c."configId",
  c."nextCheckinAt",
  cfg."graceDays",
  COALESCE(cfg."graceUnit", 'days') as grace_unit,
  c."nextCheckinAt" + 
    CASE 
      WHEN COALESCE(cfg."graceUnit", 'days') = 'minutes' THEN (cfg."graceDays" * INTERVAL '1 minute')
      WHEN COALESCE(cfg."graceUnit", 'days') = 'hours' THEN (cfg."graceDays" * INTERVAL '1 hour')
      ELSE (cfg."graceDays" * INTERVAL '1 day')
    END as grace_deadline,
  NOW() as current_time,
  CASE 
    WHEN NOW() > (c."nextCheckinAt" + 
      CASE 
        WHEN COALESCE(cfg."graceUnit", 'days') = 'minutes' THEN (cfg."graceDays" * INTERVAL '1 minute')
        WHEN COALESCE(cfg."graceUnit", 'days') = 'hours' THEN (cfg."graceDays" * INTERVAL '1 hour')
        ELSE (cfg."graceDays" * INTERVAL '1 day')
      END)
    THEN '⚠️ YES - SHOULD SEND NOW!'
    ELSE '✓ No - still has time'
  END as is_overdue,
  c.state
FROM dms_cycles c
JOIN dms_configs cfg ON c."configId" = cfg.id
WHERE c.state IN ('ACTIVE', 'GRACE', 'PENDING_RELEASE')
ORDER BY c."updatedAt" DESC
LIMIT 5;

-- 3. Your DMS Protected Messages
SELECT 
  'DMS MESSAGES' as section,
  m.id,
  m.title,
  m.status,
  m.scope,
  m."scheduledFor",
  CASE 
    WHEN m."scheduledFor" IS NULL THEN 'NOT SET'
    ELSE m."scheduledFor"::text
  END as scheduled_for_display,
  m."recipientIds",
  CASE 
    WHEN array_length(m."recipientIds", 1) IS NULL OR array_length(m."recipientIds", 1) = 0 
    THEN '❌ NO RECIPIENTS!'
    ELSE '✓ Has ' || array_length(m."recipientIds", 1) || ' recipient(s)'
  END as recipient_status,
  m."createdAt"
FROM messages m
WHERE m.scope = 'DMS'
ORDER BY m."createdAt" DESC
LIMIT 5;

-- 4. Your Recipients
SELECT 
  'RECIPIENTS' as section,
  id,
  name,
  email,
  "userId"
FROM recipients
ORDER BY "createdAt" DESC
LIMIT 5;

-- 5. What SHOULD happen (manual update test)
-- UNCOMMENT THIS IF YOU WANT TO MANUALLY TRIGGER THE RELEASE:
/*
UPDATE messages 
SET 
  status = 'SCHEDULED',
  "scheduledFor" = NOW(),
  "updatedAt" = NOW()
WHERE scope = 'DMS' 
  AND status != 'SENT'
  AND "userId" IN (SELECT "userId" FROM dms_cycles WHERE state = 'ACTIVE');
  
SELECT 'MANUAL RELEASE TRIGGERED' as result, * FROM messages WHERE scope = 'DMS' AND status = 'SCHEDULED';
*/
