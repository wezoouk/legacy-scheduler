-- Fix RLS policies to allow migration
-- Run this SQL in your Supabase SQL Editor

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can manage own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admin can access all users" ON users;
DROP POLICY IF EXISTS "Allow user creation during migration" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

DROP POLICY IF EXISTS "Users can manage own recipients" ON recipients;
DROP POLICY IF EXISTS "Admin can access all recipients" ON recipients;
DROP POLICY IF EXISTS "Allow recipient creation during migration" ON recipients;

DROP POLICY IF EXISTS "Users can manage own messages" ON messages;
DROP POLICY IF EXISTS "Admin can access all messages" ON messages;
DROP POLICY IF EXISTS "Allow message creation during migration" ON messages;

-- Create new policies that allow migration
CREATE POLICY "Allow user creation during migration"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admin can access all users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.plan = 'LEGACY'
    )
  );

-- Recipients policies
CREATE POLICY "Allow recipient creation during migration"
  ON recipients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can manage own recipients"
  ON recipients
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid());

CREATE POLICY "Admin can access all recipients"
  ON recipients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.plan = 'LEGACY'
    )
  );

-- Messages policies
CREATE POLICY "Allow message creation during migration"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can manage own messages"
  ON messages
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid());

CREATE POLICY "Admin can access all messages"
  ON messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.plan = 'LEGACY'
    )
  );

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
