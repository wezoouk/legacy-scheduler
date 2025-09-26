-- Complete fix for messages table - drop and recreate with all required columns
DROP TABLE IF EXISTS messages CASCADE;

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT DEFAULT 'NORMAL',
  types TEXT[] DEFAULT ARRAY['EMAIL'],
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  "scheduledFor" TIMESTAMPTZ,
  "recipientIds" UUID[] DEFAULT ARRAY[]::UUID[],
  "cipherBlobUrl" TEXT,
  "thumbnailUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage own messages" ON messages
  FOR ALL USING (auth.uid() = "userId");

-- Create indexes for better performance
CREATE INDEX idx_messages_user_id ON messages("userId");
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_scheduled_for ON messages("scheduledFor");
CREATE INDEX idx_messages_created_at ON messages("createdAt");



