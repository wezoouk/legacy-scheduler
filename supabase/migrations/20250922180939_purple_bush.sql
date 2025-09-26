/*
# Add INSERT policy for users table

## Summary
Fix RLS policy violations by allowing authenticated users to create their own profile records.

## Changes Made
1. Add INSERT policy for authenticated users to create their own user profiles
2. Ensure the policy only allows users to create records where auth.uid() matches the id

## Security
- Users can only insert records with their own authenticated ID
- Prevents users from creating profiles for other users
- Maintains data isolation and security
*/

-- Allow authenticated users to insert their own user profile
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);