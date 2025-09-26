/*
  # Update schema for Supabase integration

  1. Tables
     - Add recipientIds array to Message table
     - Add types array to Message table 
     - Add SiteSettings table for admin customization
     - Update Message table structure for direct client access

  2. Changes
     - Convert MessageType enum to types text array
     - Add recipientIds as text array to Message
     - Remove MessageRecipient relations for simpler client-side management
     - Add SiteSettings table for admin panel
*/

-- Add types array column to Message table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Message' AND column_name = 'types'
  ) THEN
    ALTER TABLE "Message" ADD COLUMN "types" TEXT[] DEFAULT ARRAY['EMAIL'];
  END IF;
END $$;

-- Add recipientIds array column to Message table  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Message' AND column_name = 'recipientIds'
  ) THEN
    ALTER TABLE "Message" ADD COLUMN "recipientIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;

-- Add status column to Message table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Message' AND column_name = 'status'
  ) THEN
    ALTER TABLE "Message" ADD COLUMN "status" TEXT DEFAULT 'DRAFT';
  END IF;
END $$;

-- Add scheduledFor column to Message table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Message' AND column_name = 'scheduledFor'
  ) THEN
    ALTER TABLE "Message" ADD COLUMN "scheduledFor" TIMESTAMPTZ;
  END IF;
END $$;

-- Create SiteSettings table for admin customization
CREATE TABLE IF NOT EXISTS "SiteSettings" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "heroVideoUrl" TEXT,
  "heroBackgroundColor" TEXT DEFAULT '#ffffff',
  "heroTextColor" TEXT DEFAULT '#0f172a', 
  "heroSubtextColor" TEXT DEFAULT '#64748b',
  "primaryFont" TEXT DEFAULT 'Inter',
  "primaryColor" TEXT DEFAULT '#0f172a',
  "logoUrl" TEXT,
  "siteName" TEXT DEFAULT 'Legacy Scheduler',
  "heroTitle" TEXT DEFAULT 'Send messages. Forever.',
  "heroSubtitle" TEXT DEFAULT 'Elegant scheduled messaging for legacy and care.',
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DmsConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DmsCycle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SiteSettings" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for User table
CREATE POLICY "Users can read own data"
  ON "User"
  FOR SELECT
  TO authenticated
  USING (auth.uid()::TEXT = id);

CREATE POLICY "Users can update own data"
  ON "User"
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::TEXT = id);

-- Create RLS policies for Message table
CREATE POLICY "Users can read own messages"
  ON "Message"
  FOR SELECT
  TO authenticated
  USING (auth.uid()::TEXT = "userId");

CREATE POLICY "Users can create own messages"
  ON "Message"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::TEXT = "userId");

CREATE POLICY "Users can update own messages"
  ON "Message"
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::TEXT = "userId");

CREATE POLICY "Users can delete own messages"
  ON "Message"
  FOR DELETE
  TO authenticated
  USING (auth.uid()::TEXT = "userId");

-- Create RLS policies for Recipient table
CREATE POLICY "Users can read own recipients"
  ON "Recipient"
  FOR SELECT
  TO authenticated
  USING (auth.uid()::TEXT = "userId");

CREATE POLICY "Users can create own recipients"
  ON "Recipient"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::TEXT = "userId");

CREATE POLICY "Users can update own recipients"
  ON "Recipient"
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::TEXT = "userId");

CREATE POLICY "Users can delete own recipients"
  ON "Recipient"
  FOR DELETE
  TO authenticated
  USING (auth.uid()::TEXT = "userId");

-- Create RLS policies for DmsConfig table
CREATE POLICY "Users can read own DMS config"
  ON "DmsConfig"
  FOR SELECT
  TO authenticated
  USING (auth.uid()::TEXT = "userId");

CREATE POLICY "Users can create own DMS config"
  ON "DmsConfig"
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::TEXT = "userId");

CREATE POLICY "Users can update own DMS config"
  ON "DmsConfig"
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::TEXT = "userId");

CREATE POLICY "Users can delete own DMS config"
  ON "DmsConfig"
  FOR DELETE
  TO authenticated
  USING (auth.uid()::TEXT = "userId");

-- Create RLS policies for DmsCycle table
CREATE POLICY "Users can read own DMS cycles"
  ON "DmsCycle"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "DmsConfig" 
      WHERE "DmsConfig".id = "DmsCycle"."configId" 
      AND "DmsConfig"."userId" = auth.uid()::TEXT
    )
  );

CREATE POLICY "Users can create own DMS cycles"
  ON "DmsCycle"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DmsConfig" 
      WHERE "DmsConfig".id = "DmsCycle"."configId" 
      AND "DmsConfig"."userId" = auth.uid()::TEXT
    )
  );

CREATE POLICY "Users can update own DMS cycles"
  ON "DmsCycle"
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "DmsConfig" 
      WHERE "DmsConfig".id = "DmsCycle"."configId" 
      AND "DmsConfig"."userId" = auth.uid()::TEXT
    )
  );

CREATE POLICY "Users can delete own DMS cycles"
  ON "DmsCycle"
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "DmsConfig" 
      WHERE "DmsConfig".id = "DmsCycle"."configId" 
      AND "DmsConfig"."userId" = auth.uid()::TEXT
    )
  );

-- Create RLS policies for SiteSettings table
CREATE POLICY "Anyone can read site settings"
  ON "SiteSettings"
  FOR SELECT
  TO authenticated;

CREATE POLICY "Only admins can modify site settings"
  ON "SiteSettings"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE "User".id = auth.uid()::TEXT 
      AND "User".plan = 'LEGACY'
    )
  );

-- Insert default site settings if not exists
INSERT INTO "SiteSettings" (
  "heroVideoUrl",
  "heroBackgroundColor", 
  "heroTextColor",
  "heroSubtextColor",
  "primaryFont",
  "primaryColor",
  "logoUrl",
  "siteName",
  "heroTitle", 
  "heroSubtitle"
) 
SELECT 
  NULL,
  '#ffffff',
  '#0f172a',
  '#64748b', 
  'Inter',
  '#0f172a',
  NULL,
  'Legacy Scheduler',
  'Send messages. Forever.',
  'Elegant scheduled messaging for legacy and care.'
WHERE NOT EXISTS (SELECT 1 FROM "SiteSettings");