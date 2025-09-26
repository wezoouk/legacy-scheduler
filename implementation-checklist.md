# Implementation Checklist

## Step 1: Apply SQL Views and RLS Policies

1. **Run the SQL script** in your Supabase SQL editor:
   ```bash
   # Copy the contents of sql-views-rls-seed.sql and run in Supabase dashboard
   # Replace {{AUTH_USER_ID}} with your actual user UUID
   ```

2. **Verify views are created**:
   - Check that `public.recipients` and `public.messages` views exist
   - Verify RLS policies are active on base tables

## Step 2: Set Up Email Service

1. **Set Supabase secrets**:
   ```bash
   supabase secrets set RESEND_API_KEY=sk_your_resend_api_key_here
   supabase secrets set RESEND_FROM="Legacy Scheduler <no-reply@yourdomain.com>"
   ```

2. **Deploy the edge function**:
   ```bash
   supabase functions deploy send-email
   ```

3. **Test the email function**:
   ```bash
   # Test with curl or use the debug panel in your app
   curl -X POST https://your-project.supabase.co/functions/v1/send-email \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"recipientEmail":"test@example.com","subject":"Test","content":"<p>Test email</p>"}'
   ```

## Step 3: Update Client Code

1. **Add debug banner to your dashboard**:
   ```tsx
   // In your dashboard component
   import { DebugBanner } from '../components/ui/debug-banner';
   import { useRecipients } from '../lib/use-recipients';
   import { useMessages } from '../lib/use-messages';

   const { showDemoBanner: recipientsDemo } = useRecipients();
   const { showDemoBanner: messagesDemo } = useMessages();

   return (
     <div>
       {recipientsDemo && <DebugBanner type="demo-mode" />}
       {messagesDemo && <DebugBanner type="demo-mode" />}
       {/* Your existing dashboard content */}
     </div>
   );
   ```

2. **Add email configuration banner**:
   ```tsx
   // Add this to your debug info component
   const [emailConfigError, setEmailConfigError] = useState(false);

   // In your email test handler
   const handleSendTest = async () => {
     const result = await EmailService.sendEmail(testEmail);
     if (!result.success && result.error?.includes('Missing email API key')) {
       setEmailConfigError(true);
     }
   };

   return (
     <div>
       {emailConfigError && <DebugBanner type="email-config" />}
       {/* Your existing debug content */}
     </div>
   );
   ```

## Step 4: Environment Variables

1. **Update your .env file**:
   ```env
   # Existing variables
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key

   # Optional: Development admin mode
   VITE_DEV_ADMIN_MODE=1

   # Optional: Development email fallback
   VITE_DEV_RESEND_URL=http://localhost:3001/api/send-email
   ```

## Step 5: Test Authentication Flow

1. **Test with real Supabase auth**:
   - Sign up/sign in with a real email
   - Verify UUID is generated and used
   - Check that database queries work

2. **Test demo mode**:
   - Set `VITE_DEV_ADMIN_MODE=1` in .env
   - Restart dev server
   - Verify demo banner appears
   - Check localStorage fallback works

## Step 6: Verify Everything Works

1. **Database queries**:
   - ✅ No CORS errors
   - ✅ No PostgREST 404s
   - ✅ UUID validation working
   - ✅ Demo mode fallback working

2. **Email service**:
   - ✅ Edge function deployed
   - ✅ RESEND_API_KEY configured
   - ✅ Error handling working
   - ✅ Success/failure feedback

3. **UI/UX**:
   - ✅ Debug banners appear when needed
   - ✅ No console spam
   - ✅ Clear error messages
   - ✅ Graceful fallbacks

## Step 7: Production Deployment

1. **Remove development flags**:
   ```env
   # Remove these for production
   # VITE_DEV_ADMIN_MODE=1
   # VITE_DEV_RESEND_URL=...
   ```

2. **Verify production secrets**:
   ```bash
   supabase secrets list
   ```

3. **Test in production environment**

## Troubleshooting

### Common Issues:

1. **"Invalid user ID format" messages**:
   - This is expected behavior for demo mode
   - Use `onceWarn` to reduce console spam
   - Check that real auth users get UUIDs

2. **Email service 500 errors**:
   - Verify `RESEND_API_KEY` is set: `supabase secrets list`
   - Check edge function logs: `supabase functions logs send-email`
   - Test with curl to isolate issues

3. **Database view errors**:
   - Ensure base tables exist: `"Message"` and `"Recipient"`
   - Check column names match exactly
   - Verify RLS policies are active

4. **CORS errors**:
   - Verify `VITE_SUPABASE_URL` format: `https://project.supabase.co`
   - Check that views are accessible via PostgREST

### Debug Commands:

```bash
# Check Supabase status
supabase status

# View edge function logs
supabase functions logs send-email

# List secrets
supabase secrets list

# Test database connection
supabase db reset --debug
```



