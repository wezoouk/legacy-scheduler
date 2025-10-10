-- SQL Views with RLS Policies (NO SEED DATA)

-- 1. Drop existing views and policies
DROP VIEW IF EXISTS public.recipients;
DROP VIEW IF EXISTS public.messages;

DROP POLICY IF EXISTS "Users can view their own recipients" ON "Recipient";
DROP POLICY IF EXISTS "Users can insert their own recipients" ON "Recipient";
DROP POLICY IF EXISTS "Users can update their own recipients" ON "Recipient";
DROP POLICY IF EXISTS "Users can delete their own recipients" ON "Recipient";

DROP POLICY IF EXISTS "Users can view their own messages" ON "Message";
DROP POLICY IF EXISTS "Users can insert their own messages" ON "Message";
DROP POLICY IF EXISTS "Users can update their own messages" ON "Message";
DROP POLICY IF EXISTS "Users can delete their own messages" ON "Message";

-- 2. Create views with proper column mapping
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

-- 3. Grant permissions on views
GRANT SELECT ON public.recipients TO anon;
GRANT ALL ON public.recipients TO service_role;

GRANT SELECT ON public.messages TO anon;
GRANT ALL ON public.messages TO service_role;

-- 4. Enable RLS on actual tables
ALTER TABLE "Recipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for Recipient table
CREATE POLICY "Users can view their own recipients" ON "Recipient"
  FOR SELECT USING ("userId" = auth.uid());

CREATE POLICY "Users can insert their own recipients" ON "Recipient"
  FOR INSERT WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can update their own recipients" ON "Recipient"
  FOR UPDATE USING ("userId" = auth.uid());

CREATE POLICY "Users can delete their own recipients" ON "Recipient"
  FOR DELETE USING ("userId" = auth.uid());

-- 6. Create RLS policies for Message table
CREATE POLICY "Users can view their own messages" ON "Message"
  FOR SELECT USING ("userId" = auth.uid());

CREATE POLICY "Users can insert their own messages" ON "Message"
  FOR INSERT WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can update their own messages" ON "Message"
  FOR UPDATE USING ("userId" = auth.uid());

CREATE POLICY "Users can delete their own messages" ON "Message"
  FOR DELETE USING ("userId" = auth.uid());

-- 7. Grant necessary permissions on actual tables for service_role
GRANT ALL ON "Recipient" TO service_role;
GRANT ALL ON "Message" TO service_role;



