-- ============================================
-- RELOAD SUPABASE SCHEMA CACHE
-- ============================================
-- Run this in Supabase SQL Editor to reload the schema cache
-- after adding new columns to the dms_configs table

-- Reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify that all columns exist in dms_configs
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dms_configs'
ORDER BY ordinal_position;

