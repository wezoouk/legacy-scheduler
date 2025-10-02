# Guardian Angel (DMS) Production Fix Plan

## Problem
The `process-scheduled-messages` Edge Function can't automatically release overdue DMS messages because:
1. It's using the **anon key** (user authentication)
2. **Row Level Security (RLS)** policies block it from seeing other users' data
3. Manual SQL is required to release messages

## Solution: Use Service Role Key

### Steps to Fix:

#### 1. Update GitHub Actions Workflow
The cron job in `.github/workflows/scheduled-messages.yml` needs to use the **Service Role Key**:

```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}  # Use service role, not anon
```

#### 2. Add Service Role Secret to GitHub
1. Go to your Supabase Dashboard → Settings → API
2. Copy the **service_role** key (NOT the anon key)
3. Go to GitHub repo → Settings → Secrets → Actions
4. Add new secret: `SUPABASE_SERVICE_ROLE_KEY` = [paste service role key]

#### 3. Update Edge Function Call in Workflow
In `.github/workflows/scheduled-messages.yml`, change the curl command:

```yaml
- name: Trigger Edge Function
  run: |
    curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/process-scheduled-messages" \
      -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
      -H "Content-Type: application/json"
```

### What This Fixes:
✅ Edge Function can see ALL users' DMS configs and cycles
✅ Automatically detects overdue Guardian Angel timers
✅ Releases messages without manual SQL
✅ Sends emails automatically every hour (via cron)

### Current Workaround (for testing):
- Use the "Trigger Release Now" button (will show `processed: 0` due to RLS)
- Manually run SQL to update message to SCHEDULED
- Click "Send" button in Messages tab

### For Production:
- Set up GitHub Actions with Service Role Key
- DMS will work automatically every hour
- No manual intervention needed

## Alternative: Deploy to AWS/Vercel
If you want faster triggers (not hourly), you can:
1. Deploy the Edge Function to AWS Lambda
2. Set up a cron job with AWS EventBridge (every 5 minutes)
3. Use Supabase Service Role Key in the Lambda environment

This gives you more control and faster response times.

