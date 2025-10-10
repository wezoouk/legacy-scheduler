-- Check for Guardian Angel messages
SELECT 
  id,
  title,
  status,
  types,
  "recipientIds",
  "createdAt"
FROM messages
WHERE types @> ARRAY['GUARDIAN_ANGEL']::text[]
ORDER BY "createdAt" DESC
LIMIT 10;
