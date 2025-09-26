# Cron Job Setup Options for Scheduled Messages

## Option 1: GitHub Actions (Recommended) ⭐

**Pros:** Free, reliable, integrated with your code
**Cons:** Requires GitHub repository

### Setup:
1. **Add secrets to your GitHub repo:**
   - Go to GitHub repo → Settings → Secrets and Variables → Actions
   - Add secrets:
     - `SUPABASE_URL`: `https://cvhanylywsdeblhebicj.supabase.co`
     - `SUPABASE_ANON_KEY`: `your-anon-key`

2. **Use the workflow file:** `.github/workflows/scheduled-messages.yml` (already created)

3. **Deploy:** Push to GitHub - it will run automatically every minute

### Testing:
- Go to GitHub repo → Actions tab
- Click "Process Scheduled Messages" → "Run workflow" to test manually

---

## Option 2: cron-job.org (External Service) 🌐

**Pros:** Simple setup, reliable
**Cons:** Requires external service account

### Setup:
1. **Go to:** https://cron-job.org/
2. **Create free account**
3. **Add new cron job:**
   - URL: `https://cvhanylywsdeblhebicj.supabase.co/functions/v1/process-scheduled-messages`
   - Schedule: `* * * * *` (every minute)
   - Method: POST
   - Headers:
     ```
     Authorization: Bearer your-anon-key
     Content-Type: application/json
     ```
   - Body: `{}`

---

## Option 3: EasyCron 📅

**Pros:** User-friendly interface
**Cons:** Limited free tier

### Setup:
1. **Go to:** https://www.easycron.com/
2. **Create account**
3. **Add cron job:**
   - URL: `https://cvhanylywsdeblhebicj.supabase.co/functions/v1/process-scheduled-messages`
   - When: Every minute
   - HTTP Method: POST
   - HTTP Headers: `Authorization: Bearer your-anon-key`

---

## Option 4: Vercel Cron (If using Vercel) ⚡

**Pros:** Integrated with Vercel deployment
**Cons:** Only works if you deploy to Vercel

### Setup:
1. **Create:** `vercel.json` in project root:
```json
{
  "crons": [
    {
      "path": "/api/cron/scheduled-messages",
      "schedule": "* * * * *"
    }
  ]
}
```

2. **Create:** `api/cron/scheduled-messages.ts`:
```typescript
export default async function handler() {
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/process-scheduled-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: '{}'
  });
  
  return Response.json(await response.json());
}
```

---

## Option 5: Supabase Database Functions + pg_cron 🗄️

**Pros:** Everything in Supabase
**Cons:** Requires additional setup, may not work on hosted Supabase

### Setup:
1. **Enable http extension** in Supabase dashboard:
   ```sql
   CREATE EXTENSION IF NOT EXISTS http;
   ```

2. **Run the migration:** `20250926000000_add_cron_function.sql` (already created)

3. **Note:** pg_cron may require superuser privileges not available on hosted Supabase

---

## Option 6: Your Own Server Cron 🖥️

**Pros:** Full control
**Cons:** Requires server management

### Setup on Linux server:
```bash
# Edit crontab
crontab -e

# Add this line (runs every minute):
* * * * * curl -X POST "https://cvhanylywsdeblhebicj.supabase.co/functions/v1/process-scheduled-messages" -H "Authorization: Bearer your-anon-key" -H "Content-Type: application/json" -d '{}'
```

---

## Recommended Choice: GitHub Actions

For most cases, **GitHub Actions is the best choice** because:
- ✅ Free and reliable
- ✅ Integrated with your code repository
- ✅ Easy to monitor and debug
- ✅ Version controlled
- ✅ Can be modified easily

Just push your code to GitHub with the workflow file and it will start running automatically!
