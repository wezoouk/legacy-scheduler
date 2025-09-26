/*
  # Create messages table and related enums

  1. New Enums
    - `message_scope_enum` with values: NORMAL, DMS
    - `message_status_enum` with values: DRAFT, SCHEDULED, SENT, FAILED

  2. New Tables
    - `Message`
      - `id` (uuid, primary key)
      - `userId` (uuid, foreign key to users)
      - `scope` (message_scope_enum, default NORMAL)
      - `types` (jsonb, default ["EMAIL"])
      - `title` (text, required)
      - `content` (text, required)
      - `status` (message_status_enum, default DRAFT)
      - `scheduledFor` (timestamp, optional)
      - `recipientIds` (jsonb, default [])
      - `cipherBlobUrl` (text, optional)
      - `thumbnailUrl` (text, optional)
      - `createdAt` (timestamp, default now)
      - `updatedAt` (timestamp, default now)

  3. Security
    - Enable RLS on Message table
    - Add policy for users to manage own messages
*/

-- Create message enums
CREATE TYPE IF NOT EXISTS message_scope_enum AS ENUM ('NORMAL', 'DMS');
CREATE TYPE IF NOT EXISTS message_status_enum AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'FAILED');

-- Create Message table
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

-- Enable RLS
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage own messages"
  ON "Message"
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid());