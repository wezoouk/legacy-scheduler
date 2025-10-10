-- Check what columns exist in messages and recipients tables
-- Run this in Supabase SQL Editor

-- Check messages table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Check recipients table structure  
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'recipients'
ORDER BY ordinal_position;


