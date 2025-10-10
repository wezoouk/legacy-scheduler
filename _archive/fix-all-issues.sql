-- COMPREHENSIVE FIX FOR ALL ISSUES
-- This fixes login, message storage, and enables email sending

-- 1. Drop all existing problematic tables and policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can manage own messages" ON messages;
DROP POLICY IF EXISTS "Users can read own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Users can manage own recipients" ON recipients;
DROP POLICY IF EXISTS "Users can read own recipients" ON recipients;
DROP POLICY IF EXISTS "Users can insert own recipients" ON recipients;
DROP POLICY IF EXISTS "Users can update own recipients" ON recipients;
DROP POLICY IF EXISTS "Users can delete own recipients" ON recipients;

-- Drop all existing tables (clean slate)
DROP TABLE IF EXISTS "Message" CASCADE;
DROP TABLE IF EXISTS "Recipient" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS recipients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Create users table with correct schema
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PLUS', 'LEGACY')),
    timezone TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create messages table with ALL required columns
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    "recipientIds" TEXT[] NOT NULL DEFAULT '{}',
    "scheduledFor" TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED')),
    "reminderDays" INTEGER[] NOT NULL DEFAULT '{}',
    "cipherBlobUrl" TEXT,
    "deliveryStatus" JSONB DEFAULT '{}',
    "emailResults" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create recipients table with correct schema
CREATE TABLE recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("userId", email)
);

-- 5. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;

-- 6. Create SIMPLE, working RLS policies (no recursion)

-- Users policies
CREATE POLICY "users_select" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update" ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Messages policies  
CREATE POLICY "messages_select" ON messages FOR SELECT USING (auth.uid() = "userId");
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (auth.uid() = "userId");
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (auth.uid() = "userId") WITH CHECK (auth.uid() = "userId");
CREATE POLICY "messages_delete" ON messages FOR DELETE USING (auth.uid() = "userId");

-- Recipients policies
CREATE POLICY "recipients_select" ON recipients FOR SELECT USING (auth.uid() = "userId");
CREATE POLICY "recipients_insert" ON recipients FOR INSERT WITH CHECK (auth.uid() = "userId");
CREATE POLICY "recipients_update" ON recipients FOR UPDATE USING (auth.uid() = "userId") WITH CHECK (auth.uid() = "userId");
CREATE POLICY "recipients_delete" ON recipients FOR DELETE USING (auth.uid() = "userId");

-- 7. Create indexes for performance
CREATE INDEX idx_messages_user_id ON messages("userId");
CREATE INDEX idx_messages_scheduled_for ON messages("scheduledFor");
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_recipients_user_id ON recipients("userId");
CREATE INDEX idx_recipients_email ON recipients(email);

-- 8. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipients_updated_at BEFORE UPDATE ON recipients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON recipients TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 11. Insert your user (davwez@gmail.com) to enable immediate functionality
INSERT INTO users (id, email, name, plan, timezone, "createdAt", "updatedAt") 
VALUES (
    '69d26959-9119-4ca5-987b-f982344ae5be',
    'davwez@gmail.com', 
    'davwez', 
    'LEGACY', 
    'Europe/London',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    plan = EXCLUDED.plan,
    "updatedAt" = NOW();



