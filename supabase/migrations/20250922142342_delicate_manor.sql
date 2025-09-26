/*
  # Create Dead Man's Switch tables

  1. New Tables
    - `DmsConfig`
      - Configuration for dead man's switch per user
    - `DmsCycle`
      - Active monitoring cycles for DMS

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own DMS data
*/

-- Create enums
CREATE TYPE dms_status_enum AS ENUM ('INACTIVE', 'ACTIVE', 'PAUSED');
CREATE TYPE dms_cycle_state_enum AS ENUM ('ACTIVE', 'GRACE', 'PENDING_RELEASE', 'RELEASED', 'PAUSED');

CREATE TABLE IF NOT EXISTS "DmsConfig" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  "frequencyDays" integer NOT NULL,
  "graceDays" integer NOT NULL,
  channels jsonb DEFAULT '{}'::jsonb,
  "escalationContactId" text,
  status dms_status_enum DEFAULT 'INACTIVE',
  "cooldownUntil" timestamptz,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "DmsCycle" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "configId" uuid NOT NULL REFERENCES "DmsConfig"(id) ON DELETE CASCADE,
  "nextCheckinAt" timestamptz NOT NULL,
  reminders jsonb DEFAULT '[]'::jsonb,
  state dms_cycle_state_enum DEFAULT 'ACTIVE',
  "updatedAt" timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE "DmsConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DmsCycle" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own DMS config"
  ON "DmsConfig"
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid());

CREATE POLICY "Users can manage own DMS cycles"
  ON "DmsCycle"
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "DmsConfig" 
    WHERE "DmsConfig".id = "DmsCycle"."configId" 
    AND "DmsConfig"."userId" = auth.uid()
  ));