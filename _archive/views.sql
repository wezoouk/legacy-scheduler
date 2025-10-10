-- Create views for PostgREST compatibility
-- Maps CamelCase tables to snake_case columns

-- Drop existing views if they exist
DROP VIEW IF EXISTS public.recipients;
DROP VIEW IF EXISTS public.messages;

-- Create recipients view
CREATE VIEW public.recipients AS
SELECT 
  id,
  "userId" as user_id,
  email,
  name,
  verified,
  timezone,
  "createdAt" as created_at,
  "updatedAt" as updated_at
FROM "Recipient";

-- Create messages view
CREATE VIEW public.messages AS
SELECT 
  id,
  "userId" as user_id,
  scope,
  types,
  title,
  content,
  status,
  "scheduledFor" as scheduled_for,
  "recipientIds" as recipient_ids,
  "cipherBlobUrl" as cipher_blob_url,
  "thumbnailUrl" as thumbnail_url,
  "createdAt" as created_at,
  "updatedAt" as updated_at,
  -- Add deleted column that defaults to false (since the base table doesn't have it)
  false as deleted
FROM "Message";

-- Grant permissions
GRANT SELECT ON public.recipients TO anon;
GRANT ALL ON public.recipients TO service_role;

GRANT SELECT ON public.messages TO anon;
GRANT ALL ON public.messages TO service_role;

-- Enable RLS on actual tables (if not already enabled)
ALTER TABLE "Recipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can view their own recipients" ON "Recipient";
DROP POLICY IF EXISTS "Users can insert their own recipients" ON "Recipient";
DROP POLICY IF EXISTS "Users can update their own recipients" ON "Recipient";
DROP POLICY IF EXISTS "Users can delete their own recipients" ON "Recipient";

DROP POLICY IF EXISTS "Users can view their own messages" ON "Message";
DROP POLICY IF EXISTS "Users can insert their own messages" ON "Message";
DROP POLICY IF EXISTS "Users can update their own messages" ON "Message";
DROP POLICY IF EXISTS "Users can delete their own messages" ON "Message";

-- Create RLS policies for Recipient table
CREATE POLICY "Users can view their own recipients" ON "Recipient"
  FOR SELECT USING ("userId" = auth.uid());

CREATE POLICY "Users can insert their own recipients" ON "Recipient"
  FOR INSERT WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can update their own recipients" ON "Recipient"
  FOR UPDATE USING ("userId" = auth.uid());

CREATE POLICY "Users can delete their own recipients" ON "Recipient"
  FOR DELETE USING ("userId" = auth.uid());

-- Create RLS policies for Message table
CREATE POLICY "Users can view their own messages" ON "Message"
  FOR SELECT USING ("userId" = auth.uid());

CREATE POLICY "Users can insert their own messages" ON "Message"
  FOR INSERT WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can update their own messages" ON "Message"
  FOR UPDATE USING ("userId" = auth.uid());

CREATE POLICY "Users can delete their own messages" ON "Message"
  FOR DELETE USING ("userId" = auth.uid());

-- Grant necessary permissions on actual tables for service_role
GRANT ALL ON "Recipient" TO service_role;
GRANT ALL ON "Message" TO service_role;
