/*
  # Create users table for authentication

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique, not null)
      - `name` (text, nullable)
      - `image` (text, nullable) 
      - `emailVerified` (timestamptz, nullable)
      - `passwordHash` (text, nullable)
      - `mfaEnabled` (boolean, default false)
      - `plan` (enum: FREE, PLUS, LEGACY, default FREE)
      - `timezone` (text, default 'Europe/London')
      - `createdAt` (timestamptz, default now)
      - `updatedAt` (timestamptz, default now)

  2. Security
    - Enable RLS on `users` table
    - Add policy for users to read/update their own data
    - Add policy for service role to manage all users
*/

-- Create plan enum
CREATE TYPE plan_enum AS ENUM ('FREE', 'PLUS', 'LEGACY');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  image text,
  "emailVerified" timestamptz,
  "passwordHash" text,
  "mfaEnabled" boolean DEFAULT false,
  plan plan_enum DEFAULT 'FREE',
  timezone text DEFAULT 'Europe/London',
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Service role can manage all users"
  ON users
  FOR ALL
  TO service_role
  USING (true);