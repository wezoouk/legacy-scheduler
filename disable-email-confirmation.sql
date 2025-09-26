-- Disable email confirmation in Supabase
-- Run this in your Supabase SQL Editor

-- Update auth settings to disable email confirmation
UPDATE auth.config 
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb), 
  '{email_confirm', 
  'false'::jsonb
);

-- Alternative: Update the auth.users table to confirm existing users
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- Check if the setting was applied
SELECT raw_app_meta_data FROM auth.config;



