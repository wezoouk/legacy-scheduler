-- Step 1: Update the active cycle to PENDING_RELEASE
UPDATE dms_cycles
SET 
  state = 'PENDING_RELEASE',
  "updatedAt" = NOW()
WHERE id = 'fd227c24-7523-4c70-894d-71b5cae7eb1e'
RETURNING id, state, "nextCheckinAt";

-- Step 2: Update the DMS message to SCHEDULED
UPDATE messages
SET 
  status = 'SCHEDULED',
  "scheduledFor" = NOW(),
  "updatedAt" = NOW()
WHERE id = '1edba2e7-9a40-482e-9951-6bd03bba8250'
RETURNING id, title, status, "scheduledFor", scope;

-- Step 3: Verify the message is ready to send
SELECT 
  m.id,
  m.title,
  m.status,
  m."scheduledFor",
  m.scope,
  m."recipientIds",
  m.content,
  -- Get recipient info
  (
    SELECT json_agg(
      json_build_object(
        'id', r.id,
        'name', r.name,
        'email', r.email
      )
    )
    FROM recipients r
    WHERE r.id::text = ANY(m."recipientIds")
  ) as recipients
FROM messages m
WHERE m.id = '1edba2e7-9a40-482e-9951-6bd03bba8250';

