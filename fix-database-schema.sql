-- Fix Database Schema Issues
-- Run this SQL in your Supabase SQL Editor to fix the table naming problems

-- First, let's see what tables currently exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Drop existing tables with quoted names if they exist
DROP TABLE IF EXISTS "Message" CASCADE;
DROP TABLE IF EXISTS "Recipient" CASCADE;
DROP TABLE IF EXISTS "DmsConfig" CASCADE;
DROP TABLE IF EXISTS "DmsCycle" CASCADE;

-- Create the correct tables with lowercase names that match the code

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
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
  "updatedAt" timestamptz DEFAULT now(),
  deleted boolean DEFAULT false,
  "deletedAt" timestamptz,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Recipients table
CREATE TABLE IF NOT EXISTS recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  email text NOT NULL,
  name text,
  phone text,
  verified boolean DEFAULT false,
  timezone text DEFAULT 'Europe/London',
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now(),
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- DMS config table
CREATE TABLE IF NOT EXISTS dms_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL UNIQUE,
  "frequencyDays" integer NOT NULL,
  "graceDays" integer NOT NULL,
  channels jsonb DEFAULT '{}',
  "escalationContactId" text,
  status dms_status_enum DEFAULT 'INACTIVE',
  "cooldownUntil" timestamptz,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now(),
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- DMS cycles table
CREATE TABLE IF NOT EXISTS dms_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "configId" uuid NOT NULL,
  "nextCheckinAt" timestamptz NOT NULL,
  reminders jsonb DEFAULT '{}',
  state dms_cycle_state_enum DEFAULT 'ACTIVE',
  "updatedAt" timestamptz DEFAULT now(),
  FOREIGN KEY ("configId") REFERENCES dms_configs(id) ON DELETE CASCADE
);

-- Site settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "heroVideoUrl" text,
  "heroBackgroundColor" text DEFAULT '#ffffff',
  "heroTextColor" text DEFAULT '#000000',
  "heroSubtextColor" text DEFAULT '#666666',
  "primaryFont" text DEFAULT 'Inter',
  "primaryColor" text DEFAULT '#3b82f6',
  "logoUrl" text,
  "siteName" text DEFAULT 'Legacy Scheduler',
  "heroTitle" text DEFAULT 'Schedule Your Legacy Messages',
  "heroSubtitle" text DEFAULT 'Never miss important moments with automated message delivery',
  "updatedAt" timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage own messages"
  ON messages
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid());

CREATE POLICY "Users can manage own recipients"
  ON recipients
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid());

CREATE POLICY "Users can manage own DMS configs"
  ON dms_configs
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid());

CREATE POLICY "Users can manage own DMS cycles"
  ON dms_cycles
  FOR ALL
  TO authenticated
  USING ("configId" IN (
    SELECT id FROM dms_configs WHERE "userId" = auth.uid()
  ));

-- Admin can access all data
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

-- Site settings are admin-only
CREATE POLICY "Admin can manage site settings"
  ON site_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.plan = 'LEGACY'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages("userId");
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_scheduled_for ON messages("scheduledFor");
CREATE INDEX IF NOT EXISTS idx_recipients_user_id ON recipients("userId");
CREATE INDEX IF NOT EXISTS idx_dms_configs_user_id ON dms_configs("userId");
CREATE INDEX IF NOT EXISTS idx_dms_cycles_config_id ON dms_cycles("configId");

-- Verify the tables were created correctly
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;



