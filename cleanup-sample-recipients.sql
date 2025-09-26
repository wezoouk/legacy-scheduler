-- Clean up sample recipients from database
-- Run this in Supabase SQL Editor

-- Delete sample recipients (John Doe and Jane Smith)
DELETE FROM recipients 
WHERE email IN ('john@example.com', 'jane@example.com');

-- Verify cleanup
SELECT * FROM recipients;



