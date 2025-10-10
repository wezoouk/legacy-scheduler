-- Check the actual column names in dms_cycles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dms_cycles'
ORDER BY ordinal_position;

