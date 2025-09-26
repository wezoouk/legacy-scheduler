-- Create missing tables with correct names

-- Messages table (your code expects 'messages' but DB has 'Message')
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  scope message_scope_enum DEFAULT 'NORMAL',
  types jsonb DEFAULT '["EMAIL"]',
  title text NOT NULL,
  content text NOT NULL,
  status message_status_enum DEFAULT 'DRAFT',
  "scheduledFor" timestamptz,
  "recipientIds" jsonb DEFAULT '[]',
  "cipherBlobUrl" text,
  "thumbnailUrl" text,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now(),
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Recipients table (your code expects 'recipients' but DB has 'Recipient')  
CREATE TABLE IF NOT EXISTS recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  email text NOT NULL,
  name text,
  verified boolean DEFAULT false,
  timezone text DEFAULT 'Europe/London',
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now(),
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- DMS config table (your code expects 'dms_configs' but DB has 'DmsConfig')
CREATE TABLE IF NOT EXISTS dms_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL UNIQUE,
  "frequencyDays" integer NOT NULL,
  "graceDays" integer NOT NULL,
  channels jsonb DEFAULT '{}',
  "escalationContactId" text,
  status dms_status_enum DEFAULT 'INACTIVE',
  "cooldownUntil" timestamptz,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now(),
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- DMS cycles table (your code expects 'dms_cycles' but DB has 'DmsCycle')
CREATE TABLE IF NOT EXISTS dms_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "configId" uuid NOT NULL,
  "nextCheckinAt" timestamptz NOT NULL,
  reminders jsonb DEFAULT '[]',
  state dms_cycle_state_enum DEFAULT 'ACTIVE',
  "updatedAt" timestamptz DEFAULT now(),
  FOREIGN KEY ("configId") REFERENCES dms_configs(id) ON DELETE CASCADE
);

-- Site settings table (your code expects 'site_settings' but DB has 'SiteSettings')
CREATE TABLE IF NOT EXISTS site_settings (
  id text PRIMARY KEY DEFAULT '1',
  "heroVideoUrl" text,
  "heroBackgroundColor" text DEFAULT '#ffffff',
  "heroTextColor" text DEFAULT '#0f172a',
  "heroSubtextColor" text DEFAULT '#64748b',
  "primaryFont" text DEFAULT 'Inter',
  "primaryColor" text DEFAULT '#0f172a',
  "logoUrl" text,
  "siteName" text DEFAULT 'Legacy Scheduler',
  "heroTitle" text DEFAULT 'Send messages. Forever.',
  "heroSubtitle" text DEFAULT 'Elegant scheduled messaging for legacy and care.',
  "updatedAt" timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
DROP POLICY IF EXISTS "Users can manage own messages" ON messages;
CREATE POLICY "Users can manage own messages" ON messages
  FOR ALL TO authenticated
  USING ("userId" = auth.uid());

-- Create policies for recipients  
DROP POLICY IF EXISTS "Users can manage own recipients" ON recipients;
CREATE POLICY "Users can manage own recipients" ON recipients
  FOR ALL TO authenticated
  USING ("userId" = auth.uid());

-- Create policies for dms_configs
DROP POLICY IF EXISTS "Users can manage own DMS config" ON dms_configs;
CREATE POLICY "Users can manage own DMS config" ON dms_configs
  FOR ALL TO authenticated
  USING ("userId" = auth.uid());

-- Create policies for dms_cycles
DROP POLICY IF EXISTS "Users can manage own DMS cycles" ON dms_cycles;
CREATE POLICY "Users can manage own DMS cycles" ON dms_cycles
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM dms_configs 
    WHERE dms_configs.id = dms_cycles."configId" 
    AND dms_configs."userId" = auth.uid()
  ));

-- Create policies for site_settings
DROP POLICY IF EXISTS "Anyone can read site settings" ON site_settings;
CREATE POLICY "Anyone can read site settings" ON site_settings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can update site settings" ON site_settings;
CREATE POLICY "Only admins can update site settings" ON site_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.plan = 'LEGACY'
  ));

-- Insert default site settings
INSERT INTO site_settings (id) VALUES ('1') ON CONFLICT (id) DO NOTHING;