-- Fix the grace unit to match frequency unit
-- Run this in Supabase SQL Editor

UPDATE dms_configs
SET 
  "graceUnit" = 'minutes',
  "graceDays" = 3,  -- Give 3 minutes grace period for testing
  "updatedAt" = NOW()
WHERE id = '1e1c7071-78cc-483d-bdb7-720a2ad63f8b';

-- Verify the update
SELECT 
  id,
  "frequencyDays" || ' ' || "frequencyUnit" as frequency,
  "graceDays" || ' ' || "graceUnit" as grace_period,
  status
FROM dms_configs
WHERE id = '1e1c7071-78cc-483d-bdb7-720a2ad63f8b';

