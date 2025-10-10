-- Check what columns exist in dms_cycles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dms_cycles'
ORDER BY column_name;

