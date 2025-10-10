-- Temporarily disable RLS for migration
-- Run this SQL in your Supabase SQL Editor

-- Disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipients DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Run your migration now, then re-enable RLS with this:

-- Re-enable RLS after migration
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Then run the fix-rls-policies.sql script to restore proper policies



