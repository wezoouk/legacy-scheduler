/*
  # Create Dead Man's Switch tables

  1. New Enums
    - `dms_status_enum` with values: INACTIVE, ACTIVE, PAUSED
    - `dms_cycle_state_enum` with values: ACTIVE, GRACE, PENDING_RELEASE, RELEASED, PAUSED

  2. New Tables
    - `DmsConfig`
      - `id` (uuid, primary key)
      - `userId` (uuid, foreign key to users, unique)
      - `frequencyDays` (integer, required)
      - `graceDays` (integer, required)
      - `channels` (jsonb, default {})
      - `escalationContactId` (text, optional)
      - `status` (dms_status_enum, default INACTIVE)
      - `cooldownUntil` (timestamp, optional)
      - `createdAt` (timestamp, default now)
      - `updatedAt` (timestamp, default now)

    - `DmsCycle`
      - `id` (uuid, primary key)
      - `configId` (uuid, foreign key to DmsConfig)
      - `nextCheckinAt` (timestamp, required)
      - `reminders` (jsonb, default [])
      - `state` (dms_cycle_state_enum, default ACTIVE)
      - `updatedAt` (timestamp, default now)

  3. Security
    - Enable RLS on both tables
    - Add policies for users to manage own DMS configs and cycles
*/

-- Create DMS enums
CREATE TYPE IF NOT EXISTS dms_status_enum AS ENUM ('INACTIVE', 'ACTIVE', 'PAUSED');
CREATE TYPE IF NOT EXISTS dms_cycle_state_enum AS ENUM ('ACTIVE', 'GRACE', 'PENDING_RELEASE', 'RELEASED', 'PAUSED');

-- Create DmsConfig table
CREATE TABLE IF NOT EXISTS "DmsConfig" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "frequencyDays" integer NOT NULL,
  "graceDays" integer NOT NULL,
  channels jsonb DEFAULT '{}',
  "escalationContactId" text,
  status dms_status_enum DEFAULT 'INACTIVE',
  "cooldownUntil" timestamptz,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Create DmsCycle table
CREATE TABLE IF NOT EXISTS "DmsCycle" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "configId" uuid NOT NULL REFERENCES "DmsConfig"(id) ON DELETE CASCADE,
  "nextCheckinAt" timestamptz NOT NULL,
  reminders jsonb DEFAULT '[]',
  state dms_cycle_state_enum DEFAULT 'ACTIVE',
  "updatedAt" timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE "DmsConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DmsCycle" ENABLE ROW LEVEL SECURITY;

-- Create policies for DmsConfig
CREATE POLICY "Users can manage own DMS config"
  ON "DmsConfig"
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid());

-- Create policies for DmsCycle
CREATE POLICY "Users can manage own DMS cycles"
  ON "DmsCycle"
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "DmsConfig" 
    WHERE "DmsConfig".id = "DmsCycle"."configId" 
    AND "DmsConfig"."userId" = auth.uid()
  ));