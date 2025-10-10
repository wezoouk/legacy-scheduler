# STORAGE BUCKET EXISTS - Fix RLS Policies

## Good News! 
The storage bucket already exists, but the RLS policies need to be set up.

## Solution: Run the SQL Script

### Step 1: Go to SQL Editor
1. **Go to:** https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/sql
2. **Click "New query"** or find the SQL editor

### Step 2: Copy and Run the SQL Script
1. **Copy the entire contents** of `setup-storage-bucket.sql` file
2. **Paste it** into the SQL editor
3. **Click "Run"** button

### Step 3: Test Upload
After running the SQL script, try recording video/audio again.

## What the SQL Script Does
The script creates RLS policies that allow:
- ✅ Authenticated users to upload files
- ✅ Public access to view files
- ✅ Users to update/delete their own files

## Expected Result
After running the SQL script:
- ✅ Video/audio recordings will save successfully
- ✅ Files will appear in Storage > media bucket
- ✅ Console will show "Video uploaded to Supabase Storage"

## If You Still Get Errors
1. **Check browser console** for specific error messages
2. **Verify you're signed in** to your app
3. **Make sure the bucket is public** (check bucket settings)

## Quick Test
Try recording a video/audio message now. You should see:
- "Video uploaded to Supabase Storage" in console
- File appears in Storage > media bucket
- Message saves successfully

The bucket exists - just need to fix the permissions!

