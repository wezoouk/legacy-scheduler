/*
  # Create site settings table

  1. New Tables
    - `SiteSettings`
      - `id` (text, primary key, default '1')
      - `heroVideoUrl` (text, optional)
      - `heroBackgroundColor` (text, default #ffffff)
      - `heroTextColor` (text, default #0f172a)
      - `heroSubtextColor` (text, default #64748b)
      - `primaryFont` (text, default Inter)
      - `primaryColor` (text, default #0f172a)
      - `logoUrl` (text, optional)
      - `siteName` (text, default Legacy Scheduler)
      - `heroTitle` (text, default Send messages. Forever.)
      - `heroSubtitle` (text, default Elegant scheduled messaging for legacy and care.)
      - `updatedAt` (timestamp, default now)

  2. Security
    - Enable RLS on SiteSettings table
    - Add policy for anyone to read site settings
    - Add policy for only LEGACY plan users to update settings
*/

-- Create SiteSettings table
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

-- Insert default settings
INSERT INTO "SiteSettings" (id) 
VALUES ('1') 
ON CONFLICT (id) DO NOTHING;