/*
  # Fix User table naming

  1. Database Schema Updates
    - Rename "User" table to "users" if it exists (preserving all data)
    - Create "users" table if neither exists
    - Add proper columns matching the application schema
    - Set up RLS policies for security

  2. Data Preservation
    - All existing user data is preserved during rename
    - Maintains all relationships and constraints
    - Adds missing columns with safe defaults

  3. Security
    - Enable RLS on users table
    - Add policies for authenticated users to manage their own data
    - Add service role access for admin operations
*/

-- Step 1: Rename "User" table to "users" if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'User'
  ) THEN
    EXECUTE 'ALTER TABLE "public"."User" RENAME TO "users"';
    RAISE NOTICE 'Renamed "User" table to "users"';
  END IF;
END $$;

-- Step 2: Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  image text,
  "emailVerified" timestamptz,
  "passwordHash" text,
  "mfaEnabled" boolean DEFAULT false,
  plan plan_enum DEFAULT 'FREE',
  timezone text DEFAULT 'Europe/London',
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Step 3: Add missing columns if they don't exist
DO $$
BEGIN
  -- Add name column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN name text;
  END IF;

  -- Add image column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'image'
  ) THEN
    ALTER TABLE public.users ADD COLUMN image text;
  END IF;

  -- Add emailVerified column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'emailVerified'
  ) THEN
    ALTER TABLE public.users ADD COLUMN "emailVerified" timestamptz;
  END IF;

  -- Add passwordHash column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'passwordHash'
  ) THEN
    ALTER TABLE public.users ADD COLUMN "passwordHash" text;
  END IF;

  -- Add mfaEnabled column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'mfaEnabled'
  ) THEN
    ALTER TABLE public.users ADD COLUMN "mfaEnabled" boolean DEFAULT false;
  END IF;

  -- Add plan column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'plan'
  ) THEN
    ALTER TABLE public.users ADD COLUMN plan plan_enum DEFAULT 'FREE';
  END IF;

  -- Add timezone column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE public.users ADD COLUMN timezone text DEFAULT 'Europe/London';
  END IF;

  -- Add createdAt column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE public.users ADD COLUMN "createdAt" timestamptz DEFAULT now();
  END IF;

  -- Add updatedAt column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE public.users ADD COLUMN "updatedAt" timestamptz DEFAULT now();
  END IF;
END $$;

-- Step 4: Create or replace updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $f$
BEGIN 
  NEW."updatedAt" = now(); 
  RETURN NEW; 
END;
$f$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Step 5: Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;

-- Step 7: Create comprehensive RLS policies
CREATE POLICY "Service role can manage all users"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);