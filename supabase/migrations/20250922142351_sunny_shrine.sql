/*
  # Create site settings table

  1. New Tables
    - `SiteSettings`
      - Global site customization settings
      - Singleton table (only one row)

  2. Security
    - Enable RLS on `SiteSettings` table
    - Allow all authenticated users to read settings
    - Only allow admin users (LEGACY plan) to update settings
*/

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

-- Insert default settings
INSERT INTO "SiteSettings" (id) VALUES ('1') ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE "SiteSettings" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read site settings"
  ON "SiteSettings"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update site settings"
  ON "SiteSettings"
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.plan = 'LEGACY'
  ));