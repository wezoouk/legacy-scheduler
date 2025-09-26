-- Add ALL missing columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'NORMAL';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thumbnailUrl TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS cipherBlobUrl TEXT;

-- Update any existing messages to have the default scope
UPDATE messages SET scope = 'NORMAL' WHERE scope IS NULL;



