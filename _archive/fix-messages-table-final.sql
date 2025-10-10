-- Final fix for messages table - add all missing columns and fix data types
-- This script adds missing columns without dropping the table

-- Add missing columns that the code expects
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "videoRecording" TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "audioRecording" TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB;

-- Fix data types to match what the code expects
-- Change types from TEXT[] to TEXT[] (should be fine as is)
-- Change recipientIds from UUID[] to TEXT[] to match code expectations
ALTER TABLE messages ALTER COLUMN "recipientIds" TYPE TEXT[] USING "recipientIds"::TEXT[];

-- Add comments to the columns
COMMENT ON COLUMN messages.deleted IS 'Soft delete flag';
COMMENT ON COLUMN messages."deletedAt" IS 'Timestamp when message was soft deleted';
COMMENT ON COLUMN messages."videoRecording" IS 'Base64 data URL or Supabase Storage URL for video recordings';
COMMENT ON COLUMN messages."audioRecording" IS 'Base64 data URL or Supabase Storage URL for audio recordings';
COMMENT ON COLUMN messages.attachments IS 'JSON array of file attachment metadata';

-- Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can manage own messages" ON messages;
DROP POLICY IF EXISTS "messages_select_own" ON messages;
DROP POLICY IF EXISTS "messages_insert_own" ON messages;
DROP POLICY IF EXISTS "messages_update_own" ON messages;
DROP POLICY IF EXISTS "messages_delete_own" ON messages;

-- Create comprehensive RLS policies
CREATE POLICY "messages_select_own" ON messages
  FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "messages_insert_own" ON messages
  FOR INSERT
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "messages_update_own" ON messages
  FOR UPDATE
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "messages_delete_own" ON messages
  FOR DELETE
  USING (auth.uid() = "userId");

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages("userId");
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_scheduled_for ON messages("scheduledFor");
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages("createdAt");
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted);

