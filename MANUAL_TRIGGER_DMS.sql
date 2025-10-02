-- Manually trigger DMS release for testing
-- This does what the Edge Function should do automatically

-- Step 1: Update the cycle to PENDING_RELEASE
UPDATE dms_cycles
SET 
  state = 'PENDING_RELEASE',
  "updatedAt" = NOW()
WHERE id = 'fd227c24-7523-4c70-894d-71b5cae7eb1e'
RETURNING *;

-- Step 2: Update all DMS messages to SCHEDULED status
UPDATE messages
SET 
  status = 'SCHEDULED',
  "scheduledFor" = NOW(),
  "updatedAt" = NOW()
WHERE scope = 'DMS'
AND status = 'DRAFT'
AND "userId" = '69d26959-9119-4ca5-987b-f982344ae5be'
RETURNING id, title, status, "scheduledFor";

