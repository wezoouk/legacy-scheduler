-- Reactivate the DMS config and create a new active cycle

-- 1. Reactivate the DMS config
UPDATE dms_configs
SET 
  status = 'ACTIVE',
  "updatedAt" = NOW()
WHERE id = '1e1c7071-78cc-483d-bdb7-720a2ad63f8b'
RETURNING 
  id,
  status,
  "frequencyDays",
  "frequencyUnit",
  "graceDays",
  "graceUnit";

-- 2. Update the cycle to ACTIVE with a new check-in time
UPDATE dms_cycles
SET 
  state = 'ACTIVE',
  "nextCheckinAt" = NOW() + INTERVAL '1 minute',
  "updatedAt" = NOW()
WHERE id = '2f7136e6-46be-482b-b093-c7434c6f87cd'
RETURNING 
  id,
  state,
  "nextCheckinAt";

