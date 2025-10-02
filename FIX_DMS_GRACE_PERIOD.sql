-- Fix DMS config to have proper grace period and reset cycle

-- 1. Update DMS config to have 3 minute grace period
UPDATE dms_configs
SET 
  "graceDays" = 3,
  "graceUnit" = 'minutes',
  "updatedAt" = NOW()
WHERE status = 'ACTIVE'
RETURNING 
  id,
  "userId",
  "frequencyDays",
  "frequencyUnit",
  "graceDays",
  "graceUnit",
  status;

-- 2. Reset cycle to ACTIVE state with new check-in time
UPDATE dms_cycles
SET 
  state = 'ACTIVE',
  "nextCheckinAt" = NOW() + INTERVAL '2 minutes',
  "updatedAt" = NOW()
FROM dms_configs dc
WHERE 
  dms_cycles."configId" = dc.id
  AND dc.status = 'ACTIVE'
RETURNING 
  dms_cycles.id,
  dms_cycles."nextCheckinAt",
  dms_cycles.state;

-- 3. Create new DMS test messages (set to DRAFT so they can be released by Edge Function)
-- If you want to test again, uncomment these:
-- INSERT INTO messages ("userId", title, content, types, scope, status, "recipientIds", "createdAt", "updatedAt")
-- SELECT 
--   "userId",
--   'DMS Test 3',
--   '<p>This is an automated DMS test message 3</p>',
--   ARRAY['EMAIL'],
--   'DMS',
--   'DRAFT',
--   (SELECT array_agg(id) FROM recipients WHERE "userId" = dms_configs."userId"),
--   NOW(),
--   NOW()
-- FROM dms_configs
-- WHERE status = 'ACTIVE';

