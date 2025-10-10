-- Final DMS Release - Update the correct message
UPDATE messages 
SET 
  status = 'SCHEDULED',
  "scheduledFor" = NOW(),
  "updatedAt" = NOW()
WHERE id = 'b3f27b60-948b-4534-b0bc-88c07a275c76'
  AND scope = 'DMS';

-- Verify it worked
SELECT 
  id,
  title,
  status,
  "scheduledFor",
  scope
FROM messages
WHERE id = 'b3f27b60-948b-4534-b0bc-88c07a275c76';

