-- Add missing 'scope' column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'NORMAL';

-- Update any existing messages to have the default scope
UPDATE messages SET scope = 'NORMAL' WHERE scope IS NULL;



