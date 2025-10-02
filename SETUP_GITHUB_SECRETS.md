# Setup GitHub Secrets for Automated DMS

Your GitHub Actions workflow is already configured correctly! Now you just need to add the secrets.

## Step 1: Get Your Supabase Service Role Key

1. Go to your **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Click **Settings** (gear icon in left sidebar)
4. Click **API** in the Settings menu
5. Scroll down to **Project API keys**
6. Find the **`service_role`** key (NOT the `anon` key!)
7. Click the **"Copy"** button to copy it
   - It should start with `eyJ...` and be very long
   - ⚠️ **IMPORTANT**: This is a SECRET key with full database access - never commit it to your code!

## Step 2: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** tab (top right)
3. In left sidebar, click **Secrets and variables** → **Actions**
4. Click **"New repository secret"** button

### Add Secret #1: SUPABASE_URL
- **Name**: `SUPABASE_URL`
- **Value**: Your Supabase project URL
  - Example: `https://cvhanylywsdeblhebicj.supabase.co`
  - (This is from your `.env` or Supabase dashboard)
- Click **"Add secret"**

### Add Secret #2: SUPABASE_SERVICE_ROLE_KEY
- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: Paste the `service_role` key you copied in Step 1
  - Should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...` (very long)
- Click **"Add secret"**

## Step 3: Verify Secrets

After adding both secrets, you should see:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

in your repository's Secrets list.

## Step 4: Test the Workflow

### Option A: Wait for Next Cron Run
The workflow runs **every 1 minute**, so it will automatically trigger soon.

### Option B: Manually Trigger It Now
1. Go to **Actions** tab in your GitHub repo
2. Click **"Process Scheduled Messages"** workflow in the left sidebar
3. Click **"Run workflow"** button (top right)
4. Click the green **"Run workflow"** button in the dropdown
5. Wait ~30 seconds, then check the workflow run to see if it succeeded

## What This Fixes

Once the secrets are set up:
- ✅ GitHub Actions will run **every 1 minute**
- ✅ It will check for **overdue Guardian Angel (DMS) cycles**
- ✅ It will **automatically release** DMS messages when check-ins are missed
- ✅ It will **send emails** to recipients without any manual SQL
- ✅ You can test with minutes/hours instead of waiting days!

## Current Workflow Schedule

The workflow is set to run **every 1 minute** (very frequent for testing):
```yaml
schedule:
  - cron: '*/1 * * * *' # Run every minute
```

### For Production (after testing):
You should change this to run less frequently to save GitHub Actions minutes:

**Every 5 minutes** (recommended):
```yaml
schedule:
  - cron: '*/5 * * * *'
```

**Every 15 minutes**:
```yaml
schedule:
  - cron: '*/15 * * * *'
```

**Every hour**:
```yaml
schedule:
  - cron: '0 * * * *'
```

To change the schedule, edit `.github/workflows/scheduled-messages.yml` and update the `cron` line.

## Need Help?

If you get stuck, let me know which step you're on and I'll help troubleshoot!


