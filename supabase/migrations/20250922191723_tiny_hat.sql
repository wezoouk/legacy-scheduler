-- Create all required tables for Legacy Scheduler

-- Users table (core authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    image TEXT,
    "emailVerified" TIMESTAMPTZ,
    "passwordHash" TEXT,
    "mfaEnabled" BOOLEAN DEFAULT FALSE,
    plan TEXT DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PLUS', 'LEGACY')),
    timezone TEXT DEFAULT 'Europe/London',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Recipients table
CREATE TABLE IF NOT EXISTS "Recipient" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    verified BOOLEAN DEFAULT FALSE,
    timezone TEXT DEFAULT 'Europe/London',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS "Message" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope TEXT DEFAULT 'NORMAL' CHECK (scope IN ('NORMAL', 'DMS')),
    types JSONB DEFAULT '["EMAIL"]',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'SENT', 'FAILED')),
    "scheduledFor" TIMESTAMPTZ,
    "recipientIds" JSONB DEFAULT '[]',
    "cipherBlobUrl" TEXT,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- DMS Config table
CREATE TABLE IF NOT EXISTS "DmsConfig" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "frequencyDays" INTEGER NOT NULL,
    "graceDays" INTEGER NOT NULL,
    channels JSONB DEFAULT '{}',
    "escalationContactId" TEXT,
    status TEXT DEFAULT 'INACTIVE' CHECK (status IN ('INACTIVE', 'ACTIVE', 'PAUSED')),
    "cooldownUntil" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- DMS Cycles table
CREATE TABLE IF NOT EXISTS "DmsCycle" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "configId" UUID NOT NULL REFERENCES "DmsConfig"(id) ON DELETE CASCADE,
    "nextCheckinAt" TIMESTAMPTZ NOT NULL,
    reminders JSONB DEFAULT '[]',
    state TEXT DEFAULT 'ACTIVE' CHECK (state IN ('ACTIVE', 'GRACE', 'PENDING_RELEASE', 'RELEASED', 'PAUSED')),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Site Settings table
CREATE TABLE IF NOT EXISTS "SiteSettings" (
    id TEXT PRIMARY KEY DEFAULT '1',
    "heroVideoUrl" TEXT,
    "heroBackgroundColor" TEXT DEFAULT '#ffffff',
    "heroTextColor" TEXT DEFAULT '#0f172a',
    "heroSubtextColor" TEXT DEFAULT '#64748b',
    "primaryFont" TEXT DEFAULT 'Inter',
    "primaryColor" TEXT DEFAULT '#0f172a',
    "logoUrl" TEXT,
    "siteName" TEXT DEFAULT 'Legacy Scheduler',
    "heroTitle" TEXT DEFAULT 'Send messages. Forever.',
    "heroSubtitle" TEXT DEFAULT 'Elegant scheduled messaging for legacy and care.',
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DmsConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DmsCycle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SiteSettings" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Service role can manage all users" ON users FOR ALL TO service_role USING (true);
CREATE POLICY "Users can read own data" ON users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS Policies for Recipients
CREATE POLICY "Users can manage own recipients" ON "Recipient" FOR ALL TO authenticated USING ("userId" = auth.uid());

-- RLS Policies for Messages
CREATE POLICY "Users can manage own messages" ON "Message" FOR ALL TO authenticated USING ("userId" = auth.uid());

-- RLS Policies for DMS Config
CREATE POLICY "Users can manage own DMS config" ON "DmsConfig" FOR ALL TO authenticated USING ("userId" = auth.uid());

-- RLS Policies for DMS Cycles
CREATE POLICY "Users can manage own DMS cycles" ON "DmsCycle" FOR ALL TO authenticated 
USING (EXISTS (
    SELECT 1 FROM "DmsConfig" 
    WHERE "DmsConfig".id = "DmsCycle"."configId" 
    AND "DmsConfig"."userId" = auth.uid()
));

-- RLS Policies for Site Settings
CREATE POLICY "Anyone can read site settings" ON "SiteSettings" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can update site settings" ON "SiteSettings" FOR UPDATE TO authenticated 
USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.plan = 'LEGACY'
));

-- Insert default site settings
INSERT INTO "SiteSettings" (id) VALUES ('1') ON CONFLICT (id) DO NOTHING;