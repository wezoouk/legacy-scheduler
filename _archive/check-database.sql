-- Check current database schema
-- Run this in Supabase SQL Editor to see what tables actually exist

-- 1. List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. Check users table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check messages table structure  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check recipients table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'recipients' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check RLS policies
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies 
WHERE schemaname = 'public';

-- 6. Check if your user exists
SELECT id, email, name, plan 
FROM users 
WHERE email = 'davwez@gmail.com';



