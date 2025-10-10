# Fix Admin Plan - Quick Guide

## Problem
You're showing as a "FREE" user instead of "LEGACY" (admin) because the `plan` field in your Supabase user metadata isn't set correctly.

## Quick Fix (Option 1: SQL Console)

Go to your Supabase dashboard → SQL Editor and run this:

```sql
-- Update your user to LEGACY plan
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"plan": "LEGACY"}'::jsonb
WHERE email = 'YOUR_EMAIL_HERE@example.com';
```

Replace `YOUR_EMAIL_HERE@example.com` with your actual email address.

## Alternative (Option 2: Browser Console)

1. Open browser DevTools (F12)
2. Go to Console tab
3. Run this code:

```javascript
// Get your Supabase client
const supabase = window.supabase || (() => {
  const { createClient } = window.supabaseJs;
  return createClient(
    'YOUR_SUPABASE_URL',
    'YOUR_SUPABASE_ANON_KEY'
  );
})();

// Update your user metadata
const { data, error } = await supabase.auth.updateUser({
  data: { plan: 'LEGACY' }
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Success! Plan updated to LEGACY');
  // Refresh the page
  window.location.reload();
}
```

## Alternative (Option 3: Profile Page)

I can add a quick "Make Me Admin" button to your profile page. Would you like me to do that?

## Verify It Worked

After updating, refresh the page and:
1. Go to **Admin → Users**
2. You should now show as **LEGACY** plan
3. All admin features will be accessible

## What Happened?

When you signed up, Supabase created your account but didn't set the `plan` metadata. The system defaults to `FREE` if no plan is specified. Setting it to `LEGACY` gives you full admin access.



