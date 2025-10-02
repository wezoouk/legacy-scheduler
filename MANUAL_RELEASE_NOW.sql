-- MANUAL DMS RELEASE - Run this to immediately release overdue messages
-- This does what the Edge Function should do

-- 1. Update the message to SCHEDULED status
UPDATE messages 
SET 
  status = 'SCHEDULED',
  "scheduledFor" = NOW(),
  "updatedAt" = NOW()
WHERE id = 'aefd98b7-847c-41cf-9b22-ec5c58cc2417'  -- Your DMS message ID
  AND scope = 'DMS'
  AND status != 'SENT';

-- 2. Mark the cycle as PENDING_RELEASE
UPDATE dms_cycles
SET 
  state = 'PENDING_RELEASE',
  "updatedAt" = NOW()
WHERE id = '2f7136e6-46be-482b-b093-c7434c6f87cd';  -- Your cycle ID

-- 3. Verify the updates
SELECT 
  id,
  title,
  status,
  "scheduledFor",
  scope
FROM messages
WHERE id = 'aefd98b7-847c-41cf-9b22-ec5c58cc2417';

SELECT 
  id,
  state,
  "nextCheckinAt"
FROM dms_cycles
WHERE id = '2f7136e6-46be-482b-b093-c7434c6f87cd';

