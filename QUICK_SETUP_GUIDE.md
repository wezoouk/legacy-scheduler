# ⚡ Quick Setup Guide - Security Deployment

## ✅ What's Already Done

1. ✅ **Edge Functions Deployed** with security hardening
   - `process-scheduled-messages` - ✅ Deployed
   - `send-email` - ✅ Deployed

2. ✅ **Security Features Active**
   - Rate limiting (10-20 req/min)
   - Authentication for emergency releases
   - Input sanitization (XSS protection)
   - Recipient validation

---

## 🚨 CRITICAL: Complete These 3 Steps Now

### Step 1: Apply Audit Logs Table (2 minutes)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open the file: `RUN_IN_SUPABASE_SQL_EDITOR.sql`
3. Copy all contents
4. Paste into SQL Editor
5. Click **RUN**

**Expected output:** "Audit logs table created successfully!"

---

### Step 2: Set ALLOWED_ORIGIN (1 minute)

**Option A: Using Supabase Dashboard (Easiest)**

1. Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions**
2. Scroll to **Secrets**
3. Click **"Add secret"**
4. Name: `ALLOWED_ORIGIN`
5. Value: `https://yourdomain.com` (or `*` for development)
6. Click **Save**

**Option B: Using CLI**

```bash
npx supabase secrets set ALLOWED_ORIGIN=https://yourdomain.com --project-ref cvhanylywsdeblhebicj
```

**For development/testing, use:**
```bash
npx supabase secrets set ALLOWED_ORIGIN=* --project-ref cvhanylywsdeblhebicj
```

---

### Step 3: Verify GitHub Secrets (1 minute)

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Verify these exist:
   - ✅ `SUPABASE_URL`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`

If missing, add them from your Supabase Dashboard → Project Settings → API.

---

## 🧪 Test Your Security (Optional but Recommended)

### Test 1: Check Edge Functions are Live

```bash
# Should return a response (not 404)
curl https://cvhanylywsdeblhebicj.supabase.co/functions/v1/process-scheduled-messages
```

### Test 2: Verify Audit Logs Table

In Supabase SQL Editor:
```sql
SELECT * FROM audit_logs LIMIT 1;
```

Should return empty result (no errors).

### Test 3: Check Rate Limiting (Advanced)

```bash
# Send 11 requests rapidly
for ($i=1; $i -le 11; $i++) {
  curl -X POST "https://cvhanylywsdeblhebicj.supabase.co/functions/v1/process-scheduled-messages" `
    -H "Authorization: Bearer YOUR_ANON_KEY" `
    -H "Content-Type: application/json" `
    -d '{}'
  Write-Host "Request $i"
}
```

Request 11 should return `429 Too Many Requests`.

---

## 📊 What's Protected Now

✅ **Emergency Releases** - Only GitHub Actions can trigger  
✅ **Rate Limiting** - 10-20 requests per minute per IP  
✅ **XSS Protection** - All HTML content sanitized  
✅ **Recipient Validation** - Only authorized recipients  
✅ **Audit Trail** - All actions logged (once table is created)  
✅ **CORS Protection** - Once ALLOWED_ORIGIN is set  

---

## 🎯 Summary

**Completed:**
- ✅ Edge Functions deployed with security
- ✅ Rate limiting active
- ✅ Authentication active
- ✅ Input sanitization active
- ✅ Recipient validation active

**Remaining (3 steps, ~4 minutes):**
- [ ] Apply audit logs SQL (Step 1)
- [ ] Set ALLOWED_ORIGIN (Step 2)
- [ ] Verify GitHub secrets (Step 3)

---

## 🆘 Need Help?

**If Edge Function errors:**
```bash
# Check logs
npx supabase functions logs process-scheduled-messages --project-ref cvhanylywsdeblhebicj
```

**If CORS issues:**
- Make sure `ALLOWED_ORIGIN` is set correctly
- Include `https://` prefix
- No trailing slash

**If audit logs fail:**
- Run the SQL in `RUN_IN_SUPABASE_SQL_EDITOR.sql`
- Check for error messages in SQL Editor

---

## 🎉 You're Almost Done!

Just complete the 3 steps above and your system will be **fully secured** and **production-ready**!

**Total time:** ~5 minutes  
**Security level:** Enterprise-grade 🛡️