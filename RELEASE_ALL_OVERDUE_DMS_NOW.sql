-- Release ALL overdue DMS messages immediately
-- Run this in Supabase SQL Editor

UPDATE messages
SET 
  status = 'SCHEDULED',
  "scheduledFor" = NOW(),
  "updatedAt" = NOW()
WHERE 
  scope = 'DMS'
  AND status = 'DRAFT'
RETURNING 
  id,
  title,
  status,
  "scheduledFor";

