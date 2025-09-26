/*
  # Create recipients table

  1. New Tables
    - `Recipient`
      - `id` (uuid, primary key)
      - `userId` (uuid, foreign key to users)
      - `email` (text, not null)
      - `name` (text, nullable)
      - `verified` (boolean, default false)
      - `timezone` (text, default 'Europe/London')
      - `createdAt` (timestamptz, default now)
      - `updatedAt` (timestamptz, default now)

  2. Security
    - Enable RLS on `Recipient` table
    - Add policy for users to manage their own recipients
*/

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

-- Enable RLS
ALTER TABLE "Recipient" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own recipients"
  ON "Recipient"
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid());