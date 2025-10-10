-- Add missing columns to dms_cycles table
ALTER TABLE public.dms_cycles 
  ADD COLUMN IF NOT EXISTS "userId" uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS "checkInReminderSent" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastReminderSent" timestamp with time zone;

-- Verify all columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dms_cycles'
ORDER BY column_name;

