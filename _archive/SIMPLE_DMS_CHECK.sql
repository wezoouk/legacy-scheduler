-- Simple DMS Check - Run this in Supabase SQL Editor
-- Copy all 3 queries and run them together

-- 1. Check your DMS config
SELECT 
  id,
  "userId",
  "frequencyDays",
  "frequencyUnit",
  "graceDays",
  "graceUnit",
  status,
  "createdAt"
FROM dms_configs 
ORDER BY "createdAt" DESC 
LIMIT 1;

-- 2. Check your DMS cycle (with overdue check)
SELECT 
  id,
  "userId",
  "configId",
  "nextCheckinAt",
  state,
  NOW() as current_time,
  CASE 
    WHEN "nextCheckinAt" < NOW() THEN 'PAST CHECK-IN TIME'
    ELSE 'FUTURE CHECK-IN'
  END as checkin_status,
  "updatedAt"
FROM dms_cycles 
ORDER BY "updatedAt" DESC 
LIMIT 1;

-- 3. Check your DMS message
SELECT 
  id,
  title,
  status,
  scope,
  "scheduledFor",
  "recipientIds",
  array_length("recipientIds", 1) as recipient_count,
  "createdAt"
FROM messages 
WHERE scope = 'DMS' 
ORDER BY "createdAt" DESC 
LIMIT 1;

