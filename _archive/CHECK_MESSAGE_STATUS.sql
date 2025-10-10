-- Check if the message was updated to SCHEDULED
SELECT 
  id,
  title,
  status,
  "scheduledFor",
  scope,
  "recipientIds",
  "createdAt",
  "updatedAt"
FROM messages
WHERE id = 'aefd98b7-847c-41cf-9b22-ec5c58cc2417';

