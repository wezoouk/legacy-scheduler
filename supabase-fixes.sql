-- A) Supabase SQL: Create views and RLS policies

-- 1. Create views that map to your actual CamelCase tables
CREATE OR REPLACE VIEW public.recipients AS
SELECT 
  id,
  "userId" as "userId",
  email,
  name,
  verified,
  timezone,
  "createdAt",
  "updatedAt"
FROM "Recipient";

CREATE OR REPLACE VIEW public.messages AS
SELECT 
  id,
  "userId" as "userId",
  scope,
  types,
  title,
  content,
  status,
  "scheduledFor" as "scheduledFor",
  "recipientIds" as "recipientIds",
  "cipherBlobUrl" as "cipherBlobUrl",
  "thumbnailUrl" as "thumbnailUrl",
  "createdAt",
  "updatedAt"
FROM "Message";

-- 2. Grant permissions on views
GRANT SELECT ON public.recipients TO anon;
GRANT ALL ON public.recipients TO service_role;

GRANT SELECT ON public.messages TO anon;
GRANT ALL ON public.messages TO service_role;

-- 3. Enable RLS on actual tables
ALTER TABLE "Recipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for Recipient table
CREATE POLICY "Users can view their own recipients" ON "Recipient"
  FOR SELECT USING ("userId" = auth.uid());

CREATE POLICY "Users can insert their own recipients" ON "Recipient"
  FOR INSERT WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can update their own recipients" ON "Recipient"
  FOR UPDATE USING ("userId" = auth.uid());

CREATE POLICY "Users can delete their own recipients" ON "Recipient"
  FOR DELETE USING ("userId" = auth.uid());

-- 5. Create RLS policies for Message table
CREATE POLICY "Users can view their own messages" ON "Message"
  FOR SELECT USING ("userId" = auth.uid());

CREATE POLICY "Users can insert their own messages" ON "Message"
  FOR INSERT WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can update their own messages" ON "Message"
  FOR UPDATE USING ("userId" = auth.uid());

CREATE POLICY "Users can delete their own messages" ON "Message"
  FOR DELETE USING ("userId" = auth.uid());

-- 6. Grant necessary permissions on actual tables for service_role
GRANT ALL ON "Recipient" TO service_role;
GRANT ALL ON "Message" TO service_role;



