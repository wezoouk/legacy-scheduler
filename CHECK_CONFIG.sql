-- Check DMS Config
SELECT id, "userId", "frequencyDays", "frequencyUnit", "graceDays", "graceUnit", status
FROM dms_configs
WHERE "userId" = '69d26959-9119-4ca5-987b-f982344ae5be';

