-- Find all DMS messages for your user
SELECT 
  id,
  title,
  status,
  "scheduledFor",
  scope,
  "recipientIds",
  "createdAt"
FROM messages
WHERE scope = 'DMS'
  AND "userId" = '69d26959-9119-4ca5-987b-f982344ae5be'
ORDER BY "createdAt" DESC;

