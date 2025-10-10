-- Update ALL overdue DMS messages to SCHEDULED status
-- This will make them ready to send

UPDATE messages m
SET 
  status = 'SCHEDULED',
  "scheduledFor" = NOW()
FROM dms_configs dc
LEFT JOIN dms_cycles cy ON cy."configId" = dc.id
WHERE 
  m.scope = 'DMS'
  AND m.status = 'DRAFT'
  AND m."userId" = dc."userId"
  AND dc.status = 'ACTIVE'
  AND cy."nextCheckinAt" IS NOT NULL
  AND NOW() > cy."nextCheckinAt" + (
    CASE dc."graceUnit"
      WHEN 'minutes' THEN INTERVAL '1 minute' * dc."graceDays"
      WHEN 'hours' THEN INTERVAL '1 hour' * dc."graceDays"
      WHEN 'days' THEN INTERVAL '1 day' * dc."graceDays"
      ELSE INTERVAL '1 day' * dc."graceDays"
    END
  )
RETURNING 
  m.id,
  m.title,
  m.status,
  m."scheduledFor",
  m.scope;

