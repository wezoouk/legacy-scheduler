-- Update the DMS cycle to start fresh with current time
UPDATE dms_cycles
SET 
  "nextCheckinAt" = NOW() + INTERVAL '1 minute',  -- Next check-in in 1 minute
  "updatedAt" = NOW()
WHERE "userId" = '69d26959-9119-4ca5-987b-f982344ae5be';

-- Verify
SELECT 
  id,
  "nextCheckinAt",
  NOW() as current_time,
  state
FROM dms_cycles
WHERE "userId" = '69d26959-9119-4ca5-987b-f982344ae5be';

