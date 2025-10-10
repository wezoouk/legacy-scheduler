# Quick Email Setup Guide

## ⚡ 3-Step Setup (10 minutes)

### Step 1: Deploy Edge Function
```bash
cd "C:\Users\davwe\Projects\with security"
npx supabase functions deploy send-email
```

### Step 2: Get Resend API Key
1. Go to: **https://resend.com/signup**
2. Sign up (free - 100 emails/day)
3. Click **"API Keys"** → **"Create API Key"**
4. Copy the key (starts with `re_`)

### Step 3: Add API Key to Supabase
```bash
npx supabase secrets set RESEND_API_KEY=re_paste_your_key_here
```

**OR** via Dashboard:
1. Go to: https://supabase.com/dashboard
2. Click your project
3. Settings → Edge Functions
4. Add secret: `RESEND_API_KEY`

---

## ✅ Test It!

1. Create a message in your app
2. Add recipient with **YOUR email**
3. Click "Send Now"
4. Check your inbox!

You'll see console logs:
```
📧 Sending emails for message: xyz
  → Sending to your@email.com...
  ✅ Sent to your@email.com
✅ All emails sent successfully!
```

---

## 🎯 That's It!

Emails will now work for:
- ✅ Manual sends (click "Send Now")
- ✅ Scheduled sends (automatic)
- ✅ All message types (text, video, audio, files)

---

## 🆘 Need Help?

### If emails don't send:
1. Check browser console for errors
2. Check Supabase logs: `npx supabase functions logs send-email`
3. Verify API key is set: Check Supabase Dashboard → Settings → Edge Functions
4. Check spam folder!

### Common Issues:
- **"Edge function not found"** → Deploy it with Step 1
- **"RESEND_API_KEY not configured"** → Add it with Step 3
- **"Recipient not authorized"** → Add recipient to Recipients page first

---

## 📧 Current Sender

Emails send from: **`Rembr <noreply@sugarbox.uk>`**

To change (optional):
1. Open: `supabase/functions/send-email/index.ts`
2. Line 161: Change `const from = 'Your Name <your@email.com>'`
3. Redeploy: `npx supabase functions deploy send-email`

---

See **EMAIL_SENDING_FIXED.md** for full details!



