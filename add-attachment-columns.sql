-- Add missing attachment columns to messages table
-- This allows video/audio recordings and file attachments to be stored properly

-- Add video recording column
ALTER TABLE messages ADD COLUMN IF NOT EXISTS videoRecording TEXT;

-- Add audio recording column  
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audioRecording TEXT;

-- Add attachments column (JSON array)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB;

-- Add comments to the columns
COMMENT ON COLUMN messages.videoRecording IS 'Base64 data URL or Supabase Storage URL for video recordings';
COMMENT ON COLUMN messages.audioRecording IS 'Base64 data URL or Supabase Storage URL for audio recordings';
COMMENT ON COLUMN messages.attachments IS 'JSON array of file attachment metadata';


image.png