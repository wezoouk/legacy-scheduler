/*
  # Initial Database Schema for Legacy Scheduler

  1. New Tables
    - `users` - User accounts with authentication and plan information
    - `recipients` - Contact list for message delivery  
    - `messages` - User-created messages for scheduling
    - `dms_configs` - Dead Man's Switch configuration
    - `dms_cycles` - Active DMS monitoring cycles
    - `site_settings` - Global site customization settings

  2. Security
    - Enable RLS on all tables
    - Add policies for user data isolation
    - Admin-only access for site settings

  3. Enums
    - Plan types (FREE, PLUS, LEGACY)
    - Message scopes and statuses
    - DMS states and statuses
*/

-- Create enums
CREATE TYPE plan_enum AS ENUM ('FREE', 'PLUS', 'LEGACY');
CREATE TYPE message_scope_enum AS ENUM ('NORMAL', 'DMS');
CREATE TYPE message_status_enum AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'FAILED');
CREATE TYPE dms_status_enum AS ENUM ('INACTIVE', 'ACTIVE', 'PAUSED');
CREATE TYPE dms_cycle_state_enum AS ENUM ('ACTIVE', 'GRACE', 'PENDING_RELEASE', 'RELEASED', 'PAUSED');

-- Users table
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

-- Recipients table
CREATE TABLE IF NOT EXISTS recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  verified boolean DEFAULT false,
  timezone text DEFAULT 'Europe/London',
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
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

-- DMS Config table
CREATE TABLE IF NOT EXISTS dms_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "frequencyDays" integer NOT NULL,
  "graceDays" integer NOT NULL,
  channels jsonb DEFAULT '{}',
  "escalationContactId" text,
  status dms_status_enum DEFAULT 'INACTIVE',
  "cooldownUntil" timestamptz,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- DMS Cycles table
CREATE TABLE IF NOT EXISTS dms_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "configId" uuid NOT NULL REFERENCES dms_configs(id) ON DELETE CASCADE,
  "nextCheckinAt" timestamptz NOT NULL,
  reminders jsonb DEFAULT '[]',
  state dms_cycle_state_enum DEFAULT 'ACTIVE',
  "updatedAt" timestamptz DEFAULT now()
);

-- Site Settings table
CREATE TABLE IF NOT EXISTS site_settings (
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

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data" ON users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Service role can manage all users" ON users FOR ALL TO service_role USING (true);

-- Recipients policies
CREATE POLICY "Users can manage own recipients" ON recipients FOR ALL TO authenticated USING ("userId" = auth.uid());

-- Messages policies
CREATE POLICY "Users can manage own messages" ON messages FOR ALL TO authenticated USING ("userId" = auth.uid());

-- DMS Config policies
CREATE POLICY "Users can manage own DMS config" ON dms_configs FOR ALL TO authenticated USING ("userId" = auth.uid());

-- DMS Cycles policies
CREATE POLICY "Users can manage own DMS cycles" ON dms_cycles FOR ALL TO authenticated 
USING (EXISTS (
  SELECT 1 FROM dms_configs 
  WHERE dms_configs.id = dms_cycles."configId" 
  AND dms_configs."userId" = auth.uid()
));

-- Site Settings policies
CREATE POLICY "Anyone can read site settings" ON site_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can update site settings" ON site_settings FOR UPDATE TO authenticated 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE users.id = auth.uid() 
  AND users.plan = 'LEGACY'
));