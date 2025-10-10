# 🔒 Security Environment Setup Guide

## Required Environment Variables for Edge Functions

### 1. **Supabase Dashboard** → Settings → Edge Functions → Secrets

Add these environment variables:

```bash
# Email Service (Required)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM=Rembr <onboarding@resend.dev>
RESEND_REPLY_TO=noreply@yourdomain.com

# Supabase Configuration (Auto-configured, but verify)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# SECURITY: CORS Configuration (CRITICAL!)
# Set this to your production domain
ALLOWED_ORIGIN=https://yourdomain.com

# For development/testing only:
# ALLOWED_ORIGIN=*
```

---

## 2. **Set ALLOWED_ORIGIN for Production**

### Using Supabase CLI:

```bash
# Set production domain
supabase secrets set ALLOWED_ORIGIN=https://yourdomain.com

# Verify
supabase secrets list
```

### Using Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions**
2. Click **"Add secret"**
3. Name: `ALLOWED_ORIGIN`
4. Value: `https://yourdomain.com` (your actual domain)
5. Click **Save**

---

## 3. **GitHub Actions Secrets**

Ensure these are set in your GitHub repository:

1. Go to **Repository Settings** → **Secrets and variables** → **Actions**
2. Add/verify:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## 4. **Local Development**

Create `supabase/.env.local` for local testing:

```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM=Rembr <onboarding@resend.dev>
RESEND_REPLY_TO=noreply@localhost
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key
SUPABASE_ANON_KEY=your_local_anon_key
ALLOWED_ORIGIN=http://localhost:5173
```

**Note:** Add `supabase/.env.local` to `.gitignore` to prevent committing secrets!

---

## 5. **Security Checklist**

- [ ] Set `ALLOWED_ORIGIN` to your production domain (not `*`)
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set in GitHub Secrets
- [ ] Verify `RESEND_API_KEY` is set in Supabase Edge Functions
- [ ] Ensure repository is **private** (if using GitHub Actions)
- [ ] Enable GitHub secret scanning
- [ ] Rotate service role key regularly (every 90 days)
- [ ] Monitor audit logs for suspicious activity

---

## 6. **Deploy Updated Edge Functions**

After setting environment variables, redeploy your Edge Functions:

```bash
# Deploy process-scheduled-messages
npx supabase functions deploy process-scheduled-messages --project-ref YOUR_PROJECT_REF

# Deploy send-email
npx supabase functions deploy send-email --project-ref YOUR_PROJECT_REF
```

---

## 7. **Verify Security Settings**

Test that CORS is working correctly:

```bash
# This should work (from your domain)
curl -X POST https://your-project.supabase.co/functions/v1/send-email \
  -H "Origin: https://yourdomain.com" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# This should fail (from unauthorized domain)
curl -X POST https://your-project.supabase.co/functions/v1/send-email \
  -H "Origin: https://malicious-site.com" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## 8. **Monitoring**

Check audit logs regularly:

```sql
-- View recent audit logs
SELECT 
  created_at,
  action,
  status,
  ip_address,
  error_message
FROM audit_logs
ORDER BY created_at DESC
LIMIT 100;

-- Check for failed attempts
SELECT 
  action,
  COUNT(*) as attempts,
  ip_address
FROM audit_logs
WHERE status = 'FAILURE'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY action, ip_address
ORDER BY attempts DESC;
```

---

## 🚨 IMPORTANT SECURITY NOTES

1. **Never commit `.env` files to Git**
2. **Use `*` for ALLOWED_ORIGIN only in development**
3. **Rotate service role key every 90 days**
4. **Monitor audit logs for suspicious activity**
5. **Keep GitHub repository private**
6. **Enable 2FA on all accounts**

---

## Need Help?

- Supabase Docs: https://supabase.com/docs/guides/functions/secrets
- GitHub Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets
