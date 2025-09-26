# URGENT: Storage Bucket Setup Required

## Problem
Recorded video/audio is not saving because the Supabase storage bucket doesn't exist. Since I removed localStorage fallbacks, the app now requires Supabase Storage to work.

## Solution: Create Storage Bucket Manually

### Step 1: Go to Supabase Dashboard
1. Open: https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/storage/buckets
2. Sign in to your Supabase account

### Step 2: Create Storage Bucket
1. Click **"New bucket"** button
2. Enter bucket name: `media`
3. Make it **Public** (check the public checkbox)
4. Click **"Create bucket"**

### Step 3: Set Up RLS Policies
1. Go to: https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/sql
2. Copy the entire contents of `setup-storage-bucket.sql`
3. Paste it into the SQL editor
4. Click **"Run"** to execute the script

### Step 4: Test the Setup
After creating the bucket and running the SQL script, test by:
1. Recording a video or audio message
2. Check browser console for "Video uploaded to Supabase Storage" messages
3. Verify files appear in Storage > media bucket

## Why This Happened
When I removed localStorage fallbacks, the app now **requires** Supabase Storage to work. Without the storage bucket, all media uploads fail and nothing gets saved.

## Quick Fix
If you need immediate functionality, you can temporarily re-enable localStorage fallback by reverting the changes, but the proper solution is to set up the Supabase storage bucket as described above.

## Files to Check
- `setup-storage-bucket.sql` - Contains the SQL script for RLS policies
- Browser console - Will show upload errors until bucket is created

## Expected Result
After setup:
- ✅ Video/audio recordings will upload to Supabase Storage
- ✅ Media URLs will be stored in the database
- ✅ Recordings will persist and be accessible from any device
- ✅ No localStorage quota issues

