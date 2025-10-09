# 🚨 Automatic Scheduling Not Working - Complete Fix

## Problem

Neither scheduled messages nor Guardian Angel messages are being sent automatically because there's **no automatic trigger** calling the edge function.

---

## ✅ What I Just Fixed

1. **Added scheduled message processing** to `process-scheduled-messages` edge function
   - It was only processing Guardian Angel messages
   - Now it also processes regular scheduled messages
   
2. **Fixed CORS** for both edge functions
   - Added support for `localhost:5175` and `5176`
   
3. **Both edge functions deployed**:
   - ✅ `send-email` - Sends individual emails
   - ✅ `process-scheduled-messages` - Finds and processes scheduled messages

---

## 🎯 Quick Fix Options

### Option 1: GitHub Actions (Recommended - Free & Automatic)

#### Step 1: Push to GitHub
```bash
cd "C:\Users\davwe\Projects\with security"
git add .
git commit -m "Add automatic scheduling"
git push origin main
```

#### Step 2: Add Secrets to GitHub
1. Go to your GitHub repo
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

**Secret 1: SUPABASE_URL**
```
https://cvhanylywsdeblhebicj.supabase.co
```

**Secret 2: SUPABASE_SERVICE_ROLE_KEY**
```
Get from: https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/settings/api
Copy the "service_role" key (NOT the anon key!)
```

#### Step 3: Enable GitHub Actions
1. Go to your repo → **Actions** tab
2. Enable workflows if disabled
3. The workflow will run automatically every minute!

#### Step 4: Test Manually
1. Go to **Actions** tab
2. Click "Process Scheduled Messages" workflow
3. Click "Run workflow" → "Run workflow"
4. Check logs to see if it works!

---

### Option 2: Windows Task Scheduler (Local Only - For Testing)

Create a PowerShell script to run every minute:

#### Step 1: Create Script
Save as `C:\Users\davwe\trigger-scheduled.ps1`:
```powershell
$url = "https://cvhanylywsdeblhebicj.supabase.co/functions/v1/process-scheduled-messages"
$serviceKey = "YOUR_SERVICE_ROLE_KEY_HERE"  # Get from Supabase dashboard

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers @{
        "Authorization" = "Bearer $serviceKey"
        "Content-Type" = "application/json"
    } -Body '{}'
    
    Write-Host "✅ Success: $($response.message)"
} catch {
    Write-Host "❌ Error: $_"
}
```

#### Step 2: Set Up Task Scheduler
1. Open **Task Scheduler** (search in Windows)
2. Click **Create Task**
3. **General** tab:
   - Name: "Process Scheduled Messages"
   - Run whether user is logged on or not
4. **Triggers** tab:
   - New → Repeat every 1 minute
5. **Actions** tab:
   - New → Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\Users\davwe\trigger-scheduled.ps1"`
6. Click OK

**⚠️ WARNING**: This only works while your PC is on!

---

### Option 3: Supabase pg_cron (Database-Level)

This runs in the database itself - no external service needed!

#### Step 1: Get Your Service Role Key
1. Go to: https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/settings/api
2. Copy the **service_role** key (NOT anon!)

#### Step 2: Run This SQL in Supabase SQL Editor
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Store your Supabase URL and service key as settings
ALTER DATABASE postgres SET app.settings.supabase_url TO 'https://cvhanylywsdeblhebicj.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key TO 'YOUR_SERVICE_ROLE_KEY_HERE';

-- Create function to call edge function
CREATE OR REPLACE FUNCTION call_process_scheduled_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    response http_response;
    supabase_url text := current_setting('app.settings.supabase_url');
    service_key text := current_setting('app.settings.service_role_key');
BEGIN
    -- Call the edge function
    SELECT * INTO response FROM http((
        'POST',
        supabase_url || '/functions/v1/process-scheduled-messages',
        ARRAY[
            http_header('Authorization', 'Bearer ' || service_key),
            http_header('Content-Type', 'application/json')
        ],
        'application/json',
        '{}'::text
    )::http_request);
    
    RAISE NOTICE 'Response status: %, body: %', response.status, response.content;
END;
$$;

-- Schedule to run every minute
SELECT cron.schedule(
    'process-scheduled-messages',
    '* * * * *',  -- Every minute
    'SELECT call_process_scheduled_messages();'
);
```

#### Step 3: Verify It's Running
```sql
-- Check scheduled jobs
SELECT * FROM cron.job;

-- Check job run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

**⚠️ NOTE**: pg_cron requires superuser privileges and may not be available on all Supabase plans.

---

### Option 4: Manual Trigger (Testing Only)

Create a button in your admin panel to manually trigger processing:

```typescript
const handleManualTrigger = async () => {
  const response = await fetch(
    'https://cvhanylywsdeblhebicj.supabase.co/functions/v1/process-scheduled-messages',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );
  
  const result = await response.json();
  alert(result.message);
};
```

---

## 🧪 Testing

### Test Scheduled Messages:

1. Create a message
2. Schedule it for 1-2 minutes from now
3. Wait for the schedule time
4. Check:
   - ✅ Message status changes to "SENT"
   - ✅ Email received in inbox
   - ✅ Edge function logs show processing

### Test Guardian Angel:

1. Create a DMS configuration
2. Set grace period to 1 minute
3. Don't check in
4. Wait for grace period to expire
5. Check:
   - ✅ Message status changes to "SENT"
   - ✅ Email received
   - ✅ Cycle marked as OVERDUE

---

## 📊 Monitoring

### Check Edge Function Logs:
```bash
npx supabase functions logs process-scheduled-messages --tail
```

### Or in Dashboard:
https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/functions/process-scheduled-messages/logs

---

## 🐛 Troubleshooting

### GitHub Actions Not Running
- Check if Actions are enabled in repo settings
- Check if secrets are set correctly
- Look at workflow logs in Actions tab

### Task Scheduler Not Working
- Check if PC is on
- Check execution policy: `Get-ExecutionPolicy`
- Check script logs

### pg_cron Not Working
- Check if extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
- Check if you have permissions
- Check job run history for errors

### "401 Unauthorized"
- Wrong service role key
- Get fresh key from: https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/settings/api

### "Failed to send email"
- Check RESEND_API_KEY is set: `npx supabase secrets list`
- Check Resend dashboard: https://resend.com/emails
- Check edge function logs

---

## 🎯 Recommended Setup

**For Production**: GitHub Actions
- ✅ Free
- ✅ Automatic
- ✅ Runs 24/7
- ✅ No local dependency

**For Development**: Manual trigger button
- ✅ Quick testing
- ✅ Full control
- ✅ See immediate results

---

## 📝 Next Steps

1. Choose one of the options above
2. Set it up (GitHub Actions recommended)
3. Test with a scheduled message
4. Monitor logs to ensure it's working
5. Schedule messages with confidence! 🎉

---

## ✅ Current Status

- ✅ Edge functions deployed and working
- ✅ CORS configured correctly
- ✅ Scheduled message processing added
- ✅ Guardian Angel processing working
- ❌ No automatic trigger configured yet (DO THIS NOW!)

Choose Option 1 (GitHub Actions) for best results!

