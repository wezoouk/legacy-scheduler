-- Complete Database Schema Fix
-- This script fixes all database schema issues including RLS policies and column names

-- First, drop all existing policies to avoid conflicts
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

-- Drop existing tables if they exist (to ensure clean schema)
DROP TABLE IF EXISTS "Message" CASCADE;
DROP TABLE IF EXISTS "Recipient" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS recipients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with correct schema
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PLUS', 'LEGACY')),
    timezone TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create messages table with correct schema
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
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create recipients table with correct schema
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

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive RLS policies for users table
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Create RLS policies for messages table
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

-- Create RLS policies for recipients table
CREATE POLICY "recipients_select_own" ON recipients
    FOR SELECT
    USING (auth.uid() = "userId");

CREATE POLICY "recipients_insert_own" ON recipients
    FOR INSERT
    WITH CHECK (auth.uid() = "userId");

CREATE POLICY "recipients_update_own" ON recipients
    FOR UPDATE
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");

CREATE POLICY "recipients_delete_own" ON recipients
    FOR DELETE
    USING (auth.uid() = "userId");

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages("userId");
CREATE INDEX IF NOT EXISTS idx_messages_scheduled_for ON messages("scheduledFor");
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_recipients_user_id ON recipients("userId");
CREATE INDEX IF NOT EXISTS idx_recipients_email ON recipients(email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipients_updated_at
    BEFORE UPDATE ON recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON recipients TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;



