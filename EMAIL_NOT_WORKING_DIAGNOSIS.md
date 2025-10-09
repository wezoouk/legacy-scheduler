# Email Not Working - Diagnosis & Fix

## 🔍 What's Happening

When you click "Send" or "Resend", the error is:
```
email-service.ts:203 Email service error: TypeError: Failed to fetch
Failed to send: Email service unavailable. Please configure RESEND_API_KEY in Supabase edge functions.
```

This means the **Supabase Edge Function can't be reached**.

---

## ✅ Quick Checks

### 1. Is the Edge Function Deployed?

Run this to check:
```bash
cd "C:\Users\davwe\Projects\with security"
npx supabase functions list
```

You should see `send-email` in the list.

**If NOT listed**, deploy it:
```bash
npx supabase functions deploy send-email
```

### 2. Check Your .env File

Your `.env` or `.env.local` should have:
```
VITE_SUPABASE_URL=https://cvhanylywsdeblhebicj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...your_key_here
```

### 3. Is Resend API Key Set?

The edge function needs this. Check in Supabase:
```bash
npx supabase secrets list
```

Should show `RESEND_API_KEY`.

**If NOT set**, add it:
```bash
npx supabase secrets set RESEND_API_KEY=re_your_key_here
```

Get a free key from: https://resend.com

---

## 🔧 Step-by-Step Fix

### Step 1: Login to Supabase CLI
```bash
cd "C:\Users\davwe\Projects\with security"
npx supabase login
```

### Step 2: Link Your Project
```bash
npx supabase link --project-ref cvhanylywsdeblhebicj
```

(Project ref from your URL: `https://cvhanylywsdeblhebicj.supabase.co`)

### Step 3: Deploy Edge Function
```bash
npx supabase functions deploy send-email
```

### Step 4: Set API Key
```bash
npx supabase secrets set RESEND_API_KEY=re_your_resend_key
```

### Step 5: Test

1. Go to your app: http://localhost:5173
2. Create a message
3. Add a recipient (use your own email)
4. Click "Send Now"
5. Check console for success!

---

## 📝 Alternative: Manual Setup via Dashboard

If CLI doesn't work:

### 1. Deploy via Dashboard:
1. Go to: https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/functions
2. Click "Deploy new function"
3. Copy code from: `supabase/functions/send-email/index.ts`
4. Name it: `send-email`
5. Click "Deploy"

### 2. Add API Key:
1. Same page → "Secrets" tab
2. Add: `RESEND_API_KEY` = `re_your_key`
3. Save

---

## 🐛 Still Not Working?

### Check Edge Function Logs:
```bash
npx supabase functions logs send-email
```

Or in dashboard:
https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/functions/send-email/logs

### Test Edge Function Directly:

Run this in PowerShell:
```powershell
$url = "https://cvhanylywsdeblhebicj.supabase.co/functions/v1/send-email"
$body = @{
    recipientEmail = "your@email.com"
    recipientName = "Test"
    subject = "Test Email"
    content = "<p>This is a test</p>"
    senderName = "Rembr"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer eyJhbG...your_anon_key"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri $url -Method Post -Body $body -Headers $headers
```

Expected response:
```json
{
  "success": true,
  "messageId": "some-id"
}
```

---

## ❓ Common Issues

### "Failed to fetch"
- Edge function not deployed
- Wrong Supabase URL in .env
- CORS issue (check allowed origins in edge function)

### "RESEND_API_KEY not configured"
- API key not set in Supabase secrets
- Get free key: https://resend.com (100 emails/day)

### "Recipient not authorized"
- Recipient not in your database
- Add recipient first in Recipients page

### Emails sent but not received
- Check spam folder
- Verify domain in Resend (for production)
- Check Resend dashboard: https://resend.com/emails

---

## 📊 What Should Happen

### When you click "Send Now":

```
1. Button clicked in message-list.tsx
   ↓
2. handleResendMessage() called
   ↓
3. EmailService.sendEmail() called
   ↓
4. Edge function called at:
   https://cvhanylywsdeblhebicj.supabase.co/functions/v1/send-email
   ↓
5. Edge function validates recipient
   ↓
6. Resend API sends email
   ↓
7. Success/failure returned
   ↓
8. Toast notification shown
```

### Console Output (Success):
```
Sending email via edge function: Object
Email delivery result: { success: true, messageId: "xxx" }
```

### Console Output (Current Failure):
```
Sending email via edge function: Object
Email service error: TypeError: Failed to fetch
Failed to send to davwez@gmail.com: Email service unavailable...
```

---

## 🎯 Quick Test Commands

All in one:
```bash
cd "C:\Users\davwe\Projects\with security"
npx supabase login
npx supabase link --project-ref cvhanylywsdeblhebicj
npx supabase functions deploy send-email
npx supabase secrets set RESEND_API_KEY=re_your_key_here
```

Then test in your app!

---

## 💡 Did Emails Work Before?

If emails were working before and suddenly stopped:

1. **Check if Resend API key expired**
   - Login to https://resend.com/api-keys
   - Check if key is still active

2. **Check Supabase project status**
   - https://supabase.com/dashboard/project/cvhanylywsdeblhebicj
   - Check if project is paused or has issues

3. **Check edge function status**
   - https://supabase.com/dashboard/project/cvhanylywsdeblhebicj/functions
   - See if function is deployed and healthy

---

## 📞 Need More Help?

1. Run these diagnostics:
   ```bash
   npx supabase functions list
   npx supabase secrets list
   ```

2. Check browser console for full error

3. Check Supabase edge function logs

4. Test edge function directly (see above)

Then share the output and I can help debug further!

