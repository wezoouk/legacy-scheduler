-- Add missing columns to recipients table
-- Run this in Supabase SQL Editor

-- Add verified column to recipients table
ALTER TABLE recipients 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Add phone column to recipients table (if missing)
ALTER TABLE recipients 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Check the current structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'recipients' AND table_schema = 'public'
ORDER BY ordinal_position;



