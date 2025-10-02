-- Check ALL DMS messages and their overdue status

SELECT 
  m.id,
  m.title,
  m.status,
  m."scheduledFor",
  m.scope,
  m."recipientIds",
  dc.id as config_id,
  dc."frequencyDays",
  dc."frequencyUnit",
  dc."graceDays",
  dc."graceUnit",
  dc.status as config_status,
  cy.id as cycle_id,
  cy."nextCheckinAt",
  cy.state as cycle_state,
  CASE
    WHEN cy."nextCheckinAt" IS NULL THEN 'NO CYCLE'
    WHEN NOW() > cy."nextCheckinAt" + (
      CASE dc."graceUnit"
        WHEN 'minutes' THEN INTERVAL '1 minute' * dc."graceDays"
        WHEN 'hours' THEN INTERVAL '1 hour' * dc."graceDays"
        WHEN 'days' THEN INTERVAL '1 day' * dc."graceDays"
        ELSE INTERVAL '1 day' * dc."graceDays"
      END
    ) THEN 'OVERDUE - SHOULD BE SCHEDULED'
    WHEN NOW() > cy."nextCheckinAt" THEN 'IN GRACE PERIOD'
    ELSE 'ACTIVE - NOT OVERDUE'
  END as overdue_status,
  NOW() as current_time,
  cy."nextCheckinAt" + (
    CASE dc."graceUnit"
      WHEN 'minutes' THEN INTERVAL '1 minute' * dc."graceDays"
      WHEN 'hours' THEN INTERVAL '1 hour' * dc."graceDays"
      WHEN 'days' THEN INTERVAL '1 day' * dc."graceDays"
      ELSE INTERVAL '1 day' * dc."graceDays"
    END
  ) as grace_deadline
FROM messages m
LEFT JOIN dms_configs dc ON dc."userId" = m."userId" AND dc.status = 'ACTIVE'
LEFT JOIN dms_cycles cy ON cy."configId" = dc.id
WHERE m.scope = 'DMS'
ORDER BY m."createdAt" DESC;

