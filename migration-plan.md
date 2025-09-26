# Migration Plan: Fix PostgREST 404s, UUID Issues, and Email Service

## Step 1: Database Setup (5 minutes)

### 1.1 Run SQL in Supabase Dashboard
```sql
-- Copy and paste the entire contents of database-fixes.sql
-- into your Supabase SQL Editor and run it
```

### 1.2 Verify Views Created
```sql
-- Check views exist
SELECT table_name FROM information_schema.views WHERE table_schema = 'public';
-- Should show: recipients, messages

-- Test a simple query
SELECT * FROM recipients LIMIT 1;
SELECT * FROM messages LIMIT 1;
```

## Step 2: Environment Configuration (3 minutes)

### 2.1 Create .env file
```bash
# Create .env in project root
VITE_SUPABASE_URL=https://cvhanylywsdeblhebicj.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here

# Optional: For development email fallback
VITE_DEV_RESEND_URL=http://localhost:3000/api/send-email
```

### 2.2 Set Supabase Secrets
```bash
# Set Resend API key for edge functions
supabase secrets set RESEND_API_KEY=your_resend_api_key_here

# Optional: Set custom from email
supabase secrets set RESEND_FROM=noreply@yourdomain.com

# Verify secrets are set
supabase secrets list
```

### 2.3 Deploy Edge Function
```bash
# Deploy the send-email edge function
supabase functions deploy send-email

# Or if using Supabase CLI locally
supabase functions serve send-email
```

## Step 3: Client Code Updates (10 minutes)

### 3.1 Add UUID Utility
Create `src/lib/utils.ts`:
```typescript
export const isUuid = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};
```

### 3.2 Update use-recipients.ts
- Import `isUuid` from utils
- Replace `user.id` with real auth user ID
- Add UUID validation before database calls
- Update column names to snake_case (`user_id`, `created_at`)
- Map back to camelCase for client consumption

### 3.3 Update use-messages.ts
- Import `isUuid` from utils
- Replace `user.id` with real auth user ID
- Add UUID validation before database calls
- Update column names to snake_case (`user_id`, `created_at`, `scheduled_for`)
- Map back to camelCase for client consumption
- Use safe `deleted` column filter

### 3.4 Update scheduled-message-service.ts
- Update column names to snake_case
- Add proper error handling for PGRST205

## Step 4: Email Service Updates (5 minutes)

### 4.1 Edge Function
- Deploy the new `send-email` edge function
- Function reads `RESEND_API_KEY` from environment
- Returns clear error if not configured

### 4.2 Client Email Service
- Updated error handling for configuration issues
- Only attempts fallback if `VITE_DEV_RESEND_URL` is set
- Clear error messages for missing configuration

## Step 5: Testing & Verification (10 minutes)

### 5.1 Test Database Queries
```bash
# Test in browser console
fetch('https://cvhanylywsdeblhebicj.supabase.co/rest/v1/recipients?select=*&user_id=eq.YOUR_UUID&order=created_at.desc', {
  headers: { 'Authorization': 'Bearer YOUR_ANON_KEY' }
})

fetch('https://cvhanylywsdeblhebicj.supabase.co/rest/v1/messages?select=*&order=created_at.desc', {
  headers: { 'Authorization': 'Bearer YOUR_ANON_KEY' }
})
```

### 5.2 Test Email Function
```bash
# Test edge function
curl -X POST 'https://cvhanylywsdeblhebicj.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"messageId":"test","recipientEmail":"test@example.com","recipientName":"Test","subject":"Test","content":"Test","messageType":"EMAIL"}'
```

### 5.3 Verify Fixes
- ✅ No more PostgREST 404s for recipients/messages
- ✅ No more UUID syntax errors
- ✅ No more "deleted column does not exist" errors
- ✅ Email service works or shows clear configuration error
- ✅ No more 404s for /api/send-email

## Step 6: Cleanup (2 minutes)

### 6.1 Remove Hardcoded Values
- Remove any "admin-user-id" placeholders
- Ensure all user IDs come from real auth

### 6.2 Update Error Handling
- Add proper PGRST205 handling
- Add UUID validation guards
- Add clear configuration error messages

## Troubleshooting

### If PostgREST 404s persist:
1. Verify views were created: `SELECT * FROM information_schema.views`
2. Check column names match exactly (snake_case)
3. Ensure RLS policies allow access

### If UUID errors persist:
1. Verify `isUuid()` function is imported
2. Check that real auth user ID is being used
3. Ensure no hardcoded "admin-user-id" values remain

### If email still fails:
1. Verify `RESEND_API_KEY` is set: `supabase secrets list`
2. Check edge function logs in Supabase dashboard
3. Test edge function directly with curl

### If deleted column errors persist:
1. Verify the view includes `COALESCE("deleted", false) as deleted`
2. Check that the base table has a `deleted` column or the view handles it safely

## Success Criteria
- ✅ All PostgREST queries return 200 instead of 404
- ✅ No UUID syntax errors in logs
- ✅ Email service works or shows clear configuration error
- ✅ Data loads correctly from database (not localStorage fallback)
- ✅ No CORS errors in browser console



