/*
  # Create messages table

  1. New Tables
    - `Message`
      - `id` (uuid, primary key)
      - `userId` (uuid, foreign key to users)
      - `scope` (enum: NORMAL, DMS, default NORMAL)
      - `types` (jsonb array of message types)
      - `title` (text, not null)
      - `content` (text, not null)
      - `status` (enum: DRAFT, SCHEDULED, SENT, FAILED, default DRAFT)
      - `scheduledFor` (timestamptz, nullable)
      - `recipientIds` (jsonb array of recipient IDs)
      - `cipherBlobUrl` (text, nullable)
      - `thumbnailUrl` (text, nullable)
      - `createdAt` (timestamptz, default now)
      - `updatedAt` (timestamptz, default now)

  2. Security
    - Enable RLS on `Message` table
    - Add policy for users to manage their own messages
*/

-- Create enums
CREATE TYPE message_scope_enum AS ENUM ('NORMAL', 'DMS');
CREATE TYPE message_status_enum AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'FAILED');

CREATE TABLE IF NOT EXISTS "Message" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope message_scope_enum DEFAULT 'NORMAL',
  types jsonb DEFAULT '["EMAIL"]'::jsonb,
  title text NOT NULL,
  content text NOT NULL,
  status message_status_enum DEFAULT 'DRAFT',
  "scheduledFor" timestamptz,
  "recipientIds" jsonb DEFAULT '[]'::jsonb,
  "cipherBlobUrl" text,
  "thumbnailUrl" text,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own messages"
  ON "Message"
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid());