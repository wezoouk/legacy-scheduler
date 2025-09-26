-- Add missing deletion columns to messages table
-- This allows proper soft deletion of messages

-- Add the deleted column (boolean flag)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Add the deletedAt column (timestamp)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMPTZ;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted);
CREATE INDEX IF NOT EXISTS idx_messages_deletedAt ON messages(deletedAt);

-- Update any existing messages to have deleted = false
UPDATE messages SET deleted = FALSE WHERE deleted IS NULL;

-- Add comments to the columns
COMMENT ON COLUMN messages.deleted IS 'Soft delete flag - true if message is deleted';
COMMENT ON COLUMN messages.deletedAt IS 'Timestamp when message was soft deleted - NULL if not deleted';
