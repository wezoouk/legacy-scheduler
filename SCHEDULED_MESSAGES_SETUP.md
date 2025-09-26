# Scheduled Messages Setup - Server-Side Solution

## Problem with Original Approach

The client-side scheduled message service was flawed because:
- ❌ Only works when user has browser open
- ❌ Requires user to be logged in 
- ❌ Won't work on production servers
- ❌ Limited by Row Level Security policies

## New Server-Side Solution

### 1. Supabase Edge Function

Created: `supabase/functions/process-scheduled-messages/index.ts`

This function:
- ✅ Runs on Supabase servers
- ✅ Uses service role key (bypasses RLS)
- ✅ Processes ALL users' scheduled messages
- ✅ Works 24/7 without browser dependency

### 2. Deploy the Edge Function

```bash
# Deploy to Supabase
supabase functions deploy process-scheduled-messages

# Set required environment variables in Supabase dashboard:
# - SUPABASE_URL (auto-set)
# - SUPABASE_SERVICE_ROLE_KEY (from Supabase dashboard)
# - RESEND_API_KEY (your Resend API key)
```

### 3. Set Up Automatic Triggering

The function needs to be called periodically. Options:

#### Option A: GitHub Actions (Recommended)
```yaml
# .github/workflows/scheduled-messages.yml
name: Process Scheduled Messages
on:
  schedule:
    - cron: '* * * * *'  # Every minute

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/process-scheduled-messages" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{}'
```

#### Option B: Vercel Cron (if deploying on Vercel)
```typescript
// api/cron/scheduled-messages.ts
export default async function handler(req: Request) {
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/process-scheduled-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  });
  
  return Response.json(await response.json());
}
```

#### Option C: External Cron Service
Use services like:
- cron-job.org
- EasyCron
- Zapier Scheduler

Call: `POST {your-supabase-url}/functions/v1/process-scheduled-messages`

### 4. Testing

1. **Manual Testing**: Use the admin dashboard button to test the function
2. **Check Logs**: View function logs in Supabase dashboard
3. **Monitor**: Set up monitoring/alerts for failed function calls

### 5. Environment Variables Needed

In Supabase Edge Functions environment:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-key
RESEND_FROM=Your App <noreply@yourdomain.com>
RESEND_REPLY_TO=noreply@yourdomain.com
```

## Migration Steps

1. Deploy the new edge function
2. Set up cron job to call it every minute
3. Test with a scheduled message
4. Monitor logs to ensure it's working
5. The old client-side service is now disabled

## Benefits of New Approach

- ✅ Works on production servers
- ✅ Processes all users' messages
- ✅ No browser dependency
- ✅ Reliable server-side execution
- ✅ Proper error handling and logging
- ✅ Scalable architecture

## Monitoring

- Check Supabase function logs
- Monitor message status changes
- Set up alerts for function failures
- Track email delivery rates
