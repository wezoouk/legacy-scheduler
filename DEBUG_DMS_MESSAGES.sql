-- Debug DMS Messages - Check if they're ready to send
-- Run this in Supabase SQL Editor

SELECT 
  m.id,
  m.title,
  m.scope,
  m.status,
  m."scheduledFor",
  m."recipientIds",
  m."createdAt",
  m."updatedAt",
  -- Check if recipients exist
  (SELECT COUNT(*) FROM recipients r WHERE r.id = ANY(m."recipientIds")) as recipient_count,
  -- Check if overdue
  CASE 
    WHEN m."scheduledFor" IS NOT NULL AND m."scheduledFor" < NOW() THEN 'OVERDUE'
    WHEN m."scheduledFor" IS NULL THEN 'NO SCHEDULE'
    ELSE 'FUTURE'
  END as schedule_status
FROM messages m
WHERE m.scope = 'DMS'
ORDER BY m."createdAt" DESC;

-- Also check the actual recipients
SELECT 
  r.id,
  r.name,
  r.email,
  r."userId"
FROM recipients r
ORDER BY r."createdAt" DESC;

