-- Safe table creation script that won't fail on existing objects

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
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

-- Create enums if they don't exist
DO $$ BEGIN
  CREATE TYPE plan_enum AS ENUM ('FREE', 'PLUS', 'LEGACY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_scope_enum AS ENUM ('NORMAL', 'DMS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_status_enum AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE dms_status_enum AS ENUM ('INACTIVE', 'ACTIVE', 'PAUSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE dms_cycle_state_enum AS ENUM ('ACTIVE', 'GRACE', 'PENDING_RELEASE', 'RELEASED', 'PAUSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create recipients table
CREATE TABLE IF NOT EXISTS "Recipient" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  verified boolean DEFAULT false,
  timezone text DEFAULT 'Europe/London',
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS "Message" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope message_scope_enum DEFAULT 'NORMAL',
  types jsonb DEFAULT '["EMAIL"]',
  title text NOT NULL,
  content text NOT NULL,
  status message_status_enum DEFAULT 'DRAFT',
  "scheduledFor" timestamptz,
  "recipientIds" jsonb DEFAULT '[]',
  "cipherBlobUrl" text,
  "thumbnailUrl" text,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Create DMS config table
CREATE TABLE IF NOT EXISTS "DmsConfig" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  "frequencyDays" integer NOT NULL,
  "graceDays" integer NOT NULL,
  channels jsonb DEFAULT '{}',
  "escalationContactId" text,
  status dms_status_enum DEFAULT 'INACTIVE',
  "cooldownUntil" timestamptz,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Create DMS cycle table
CREATE TABLE IF NOT EXISTS "DmsCycle" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "configId" uuid NOT NULL REFERENCES "DmsConfig"(id) ON DELETE CASCADE,
  "nextCheckinAt" timestamptz NOT NULL,
  reminders jsonb DEFAULT '[]',
  state dms_cycle_state_enum DEFAULT 'ACTIVE',
  "updatedAt" timestamptz DEFAULT now()
);

-- Create site settings table
CREATE TABLE IF NOT EXISTS "SiteSettings" (
  id text PRIMARY KEY DEFAULT '1',
  "heroVideoUrl" text,
  "heroBackgroundColor" text DEFAULT '#ffffff',
  "heroTextColor" text DEFAULT '#0f172a',
  "heroSubtextColor" text DEFAULT '#64748b',
  "primaryFont" text DEFAULT 'Inter',
  "primaryColor" text DEFAULT '#0f172a',
  "logoUrl" text,
  "siteName" text DEFAULT 'Legacy Scheduler',
  "heroTitle" text DEFAULT 'Send messages. Forever.',
  "heroSubtitle" text DEFAULT 'Elegant scheduled messaging for legacy and care.',
  "updatedAt" timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DmsConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DmsCycle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SiteSettings" ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$ 
BEGIN
  -- Users policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Service role can manage all users') THEN
    CREATE POLICY "Service role can manage all users" ON users FOR ALL TO service_role USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can read own data') THEN
    CREATE POLICY "Users can read own data" ON users FOR SELECT TO authenticated USING (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own data') THEN
    CREATE POLICY "Users can update own data" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);
  END IF;

  -- Recipients policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Recipient' AND policyname = 'Users can manage own recipients') THEN
    CREATE POLICY "Users can manage own recipients" ON "Recipient" FOR ALL TO authenticated USING ("userId" = auth.uid());
  END IF;

  -- Messages policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'Message' AND policyname = 'Users can manage own messages') THEN
    CREATE POLICY "Users can manage own messages" ON "Message" FOR ALL TO authenticated USING ("userId" = auth.uid());
  END IF;

  -- DMS Config policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'DmsConfig' AND policyname = 'Users can manage own DMS config') THEN
    CREATE POLICY "Users can manage own DMS config" ON "DmsConfig" FOR ALL TO authenticated USING ("userId" = auth.uid());
  END IF;

  -- DMS Cycle policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'DmsCycle' AND policyname = 'Users can manage own DMS cycles') THEN
    CREATE POLICY "Users can manage own DMS cycles" ON "DmsCycle" FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM "DmsConfig" WHERE "DmsConfig".id = "DmsCycle"."configId" AND "DmsConfig"."userId" = auth.uid()));
  END IF;

  -- Site Settings policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'SiteSettings' AND policyname = 'Anyone can read site settings') THEN
    CREATE POLICY "Anyone can read site settings" ON "SiteSettings" FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'SiteSettings' AND policyname = 'Only admins can update site settings') THEN
    CREATE POLICY "Only admins can update site settings" ON "SiteSettings" FOR UPDATE TO authenticated 
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.plan = 'LEGACY'));
  END IF;
END $$;

-- Insert default site settings if they don't exist
INSERT INTO "SiteSettings" (id) VALUES ('1') ON CONFLICT (id) DO NOTHING;