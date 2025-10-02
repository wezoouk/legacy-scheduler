# ✅ Quick Setup Guide - Guardian Angel Automation

## What We Just Did:
✅ Deployed updated Edge Function with automatic DMS processing
✅ Edge Function now detects overdue Guardian Angel cycles and releases messages

## What You Need to Do Now (2 minutes):

### Step 1: Get Your Service Role Key
1. Go to: https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/settings/api
2. Scroll to **Project API keys**
3. Find **`service_role`** (secret) key
4. Click **Copy** (it's a very long string starting with `eyJ...`)

### Step 2: Add GitHub Secrets
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**

**Add Secret #1:**
- Name: `SUPABASE_URL`
- Value: `https://cvhanylywsdeblhebicj.supabase.co`
- Click "Add secret"

**Add Secret #2:**
- Name: `SUPABASE_SERVICE_ROLE_KEY`  
- Value: [Paste the service_role key from Step 1]
- Click "Add secret"

### Step 3: Test It!

**Option A: Manual Trigger (Immediate)**
1. Go to **Actions** tab in GitHub
2. Click **"Process Scheduled Messages"** workflow
3. Click **"Run workflow"** → **"Run workflow"**
4. Wait 30 seconds, check the run logs

**Option B: Wait 1 Minute**
- The cron job runs every minute automatically
- It will detect your overdue DMS and release the messages

---

## What Happens After Setup:

### Automatic DMS Release:
1. ⏰ Every **1 minute**, GitHub Actions triggers the Edge Function
2. 🛡️ Edge Function checks all **active Guardian Angel configs**
3. 🕒 Calculates grace deadline (check-in time + grace period)
4. 🚨 If overdue, it **automatically updates messages to SCHEDULED**
5. 📧 Sends the emails to all recipients
6. ✅ Updates message status to **SENT**

### Your Two DMS Messages:
- Once you set up the secrets, **within 1 minute** both overdue DMS messages will be:
  - ✅ Updated to `SCHEDULED` status
  - ✅ Sent to recipients
  - ✅ Status changed to `SENT`

---

## Current Settings:
- **Cron Schedule**: Every 1 minute (`*/1 * * * *`)
- **DMS Check**: Automatic every run
- **Grace Unit**: Minutes (for testing)

### After Testing (Optional):
Change to every 5 minutes to save GitHub Actions quota:
```yaml
# In .github/workflows/scheduled-messages.yml
schedule:
  - cron: '*/5 * * * *'  # Every 5 minutes
```

---

## ✨ That's It!
No more manual SQL scripts needed. Guardian Angel will work automatically! 🎉

