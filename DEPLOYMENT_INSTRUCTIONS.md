# 🚀 Deployment Instructions - Security Hardened Guardian Angel

**All security fixes have been committed and pushed to GitHub!**

---

## ⚠️ CRITICAL: Deploy These Changes Before Production Use

Your Guardian Angel system now has enterprise-grade security, but you **MUST** deploy these changes to activate them.

---

## 📋 Step-by-Step Deployment

### Step 1: Apply Database Migration (Audit Logs)

```bash
# Connect to your Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push the audit logs migration
npx supabase db push
```

**Or manually in Supabase SQL Editor:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251005000000_create_audit_logs.sql`
3. Paste and run

---

### Step 2: Set Environment Variables

#### In Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**

2. Add/update these secrets:

```bash
# CRITICAL: Set your production domain
ALLOWED_ORIGIN=https://yourdomain.com

# Verify these are set:
RESEND_API_KEY=re_your_actual_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
```

#### Using Supabase CLI:

```bash
# Set CORS origin (CRITICAL!)
npx supabase secrets set ALLOWED_ORIGIN=https://yourdomain.com

# Verify all secrets
npx supabase secrets list
```

---

### Step 3: Deploy Updated Edge Functions

```bash
# Get your project ref from Supabase dashboard
# It's in Settings → General → Reference ID

# Deploy process-scheduled-messages (with security)
npx supabase functions deploy process-scheduled-messages --project-ref YOUR_PROJECT_REF

# Deploy send-email (with security)
npx supabase functions deploy send-email --project-ref YOUR_PROJECT_REF
```

**Expected output:**
```
Deploying function process-scheduled-messages...
Function deployed successfully!
URL: https://your-project.supabase.co/functions/v1/process-scheduled-messages
```

---

### Step 4: Verify GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Verify these secrets exist:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

If missing, add them:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

### Step 5: Test Security Features

#### Test 1: Rate Limiting

```bash
# Send 11 requests rapidly (should get rate limited on 11th)
for i in {1..11}; do
  curl -X POST "https://your-project.supabase.co/functions/v1/process-scheduled-messages" \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{}'
  echo "Request $i"
done
```

**Expected:** Request 11 returns `429 Too Many Requests`

---

#### Test 2: Emergency Release Authentication

```bash
# Try emergency release with anon key (should FAIL)
curl -X POST "https://your-project.supabase.co/functions/v1/process-scheduled-messages" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"emergency_release": true}'
```

**Expected:** `401 Unauthorized: Emergency release requires service role key`

```bash
# Try with service role key (should SUCCEED)
curl -X POST "https://your-project.supabase.co/functions/v1/process-scheduled-messages" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"emergency_release": true}'
```

**Expected:** `200 OK` with processed messages

---

#### Test 3: CORS Protection

```bash
# From unauthorized origin (should fail)
curl -X POST "https://your-project.supabase.co/functions/v1/send-email" \
  -H "Origin: https://malicious-site.com" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Expected:** CORS error or rejected request

---

#### Test 4: Audit Logs

In Supabase SQL Editor:

```sql
-- Check audit logs are being created
SELECT 
  created_at,
  action,
  status,
  ip_address,
  metadata
FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** See logs for your test requests

---

### Step 6: Monitor Audit Logs

Set up regular monitoring:

```sql
-- Check for failed attempts (security incidents)
SELECT 
  action,
  COUNT(*) as attempts,
  ip_address,
  error_message
FROM audit_logs
WHERE status = 'FAILURE'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY action, ip_address, error_message
ORDER BY attempts DESC;

-- Check for emergency releases
SELECT 
  created_at,
  user_id,
  action,
  metadata,
  ip_address
FROM audit_logs
WHERE action IN ('DMS_EMERGENCY_RELEASE', 'DMS_OVERDUE_RELEASE')
ORDER BY created_at DESC
LIMIT 20;
```

---

## ✅ Deployment Checklist

- [ ] Database migration applied (audit_logs table created)
- [ ] `ALLOWED_ORIGIN` set to production domain
- [ ] All Supabase secrets verified
- [ ] `process-scheduled-messages` Edge Function deployed
- [ ] `send-email` Edge Function deployed
- [ ] GitHub Actions secrets verified
- [ ] Rate limiting tested and working
- [ ] Emergency release authentication tested
- [ ] CORS protection tested
- [ ] Audit logs verified
- [ ] Monitoring queries saved

---

## 🔐 Security Checklist

- [ ] Repository is **private** (if using GitHub Actions)
- [ ] 2FA enabled on GitHub account
- [ ] 2FA enabled on Supabase account
- [ ] Service role key rotated (if old)
- [ ] GitHub secret scanning enabled
- [ ] Audit logs reviewed weekly
- [ ] Rate limits appropriate for your usage
- [ ] CORS set to production domain (not `*`)

---

## 📊 What's Now Protected

✅ **Emergency Releases** - Only GitHub Actions can trigger  
✅ **CORS Attacks** - Only your domain can call functions  
✅ **DDoS/Spam** - Rate limiting prevents abuse  
✅ **XSS Attacks** - All HTML content sanitized  
✅ **Unauthorized Emails** - Recipients validated  
✅ **Security Incidents** - Full audit trail  

---

## 🚨 If Something Goes Wrong

### Edge Function Deployment Fails

```bash
# Check function logs
npx supabase functions logs process-scheduled-messages --project-ref YOUR_PROJECT_REF

# Redeploy with --no-verify-jwt flag (for testing only)
npx supabase functions deploy process-scheduled-messages --no-verify-jwt --project-ref YOUR_PROJECT_REF
```

### Rate Limiting Too Strict

Adjust in code:
- `supabase/functions/process-scheduled-messages/index.ts:19-22`
- `supabase/functions/send-email/index.ts:20-23`

Change `maxRequests` value, then redeploy.

### CORS Issues

Make sure `ALLOWED_ORIGIN` matches your exact domain:
- Include `https://` prefix
- No trailing slash
- Exact match (including subdomain)

```bash
# Check current value
npx supabase secrets list

# Update if needed
npx supabase secrets set ALLOWED_ORIGIN=https://yourdomain.com
```

---

## 📞 Support

- **Supabase Docs:** https://supabase.com/docs
- **Edge Functions:** https://supabase.com/docs/guides/functions
- **Security Best Practices:** https://supabase.com/docs/guides/auth/auth-helpers/auth-ui

---

## 🎉 You're Done!

Your Guardian Angel system is now:
- ✅ **Secure** - Enterprise-grade security
- ✅ **Protected** - Multiple layers of defense
- ✅ **Monitored** - Full audit trail
- ✅ **Production-Ready** - Safe to deploy

**Congratulations on building a secure system!** 🛡️🎯
