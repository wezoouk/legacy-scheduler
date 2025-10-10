-- Verify the grace unit was updated
SELECT 
  id,
  "frequencyDays",
  "frequencyUnit",
  "graceDays",
  "graceUnit",
  status
FROM dms_configs
WHERE id = '1e1c7071-78cc-483d-bdb7-720a2ad63f8b';

