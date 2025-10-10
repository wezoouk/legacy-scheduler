-- Check ALL DMS messages and their associated configs
SELECT 
  m.id,
  m.title,
  m.status,
  m."createdAt",
  -- Try to find associated config
  (SELECT "graceDays" FROM dms_configs WHERE "userId" = m."userId" LIMIT 1) as grace_days,
  (SELECT "graceUnit" FROM dms_configs WHERE "userId" = m."userId" LIMIT 1) as grace_unit
FROM messages m
WHERE m.scope = 'DMS'
  AND m."userId" = '69d26959-9119-4ca5-987b-f982344ae5be'
ORDER BY m."createdAt" DESC;

