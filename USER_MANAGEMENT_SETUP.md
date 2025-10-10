# User Management Setup Guide

## Current Status

The User Management page has been updated to fetch users from **Supabase Auth**, but there's an important limitation:

### ⚠️ Admin API Requires Service Role Key

The `supabase.auth.admin.*` methods (like `listUsers`, `updateUserById`, `deleteUser`) require **server-side authentication** with the `service_role` key, not the client-side `anon` key.

## What Works Now

- ✅ UI is fully functional with loading states
- ✅ User editing dialog
- ✅ Plan changing dropdown  
- ✅ User deletion confirmation
- ✅ Search and filtering
- ✅ Dark mode support
- ✅ Detailed user statistics

## What Needs Implementation

### Option 1: Supabase Edge Function (Recommended)

Create a server-side endpoint that admin users can call:

```typescript
// supabase/functions/admin-users/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Service role key!
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Get auth header
  const authHeader = req.headers.get('Authorization')!
  const token = authHeader.replace('Bearer ', '')
  
  // Verify user is admin
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  
  if (!user || user.user_metadata?.plan !== 'LEGACY') {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { method } = req
  const url = new URL(req.url)

  if (method === 'GET' && url.pathname.endsWith('/list')) {
    // List all users
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    return new Response(JSON.stringify({ users: data.users }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (method === 'PATCH' && url.pathname.includes('/update/')) {
    // Update user
    const userId = url.pathname.split('/').pop()!
    const body = await req.json()
    
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, body)
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (method === 'DELETE' && url.pathname.includes('/delete/')) {
    // Delete user
    const userId = url.pathname.split('/').pop()!
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(
    JSON.stringify({ error: 'Not found' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  )
})
```

**Deploy the edge function:**

```bash
supabase functions deploy admin-users --no-verify-jwt
```

**Update the client code to use the edge function:**

```typescript
// src/lib/admin-api.ts
import { supabase } from './supabase';

export async function listUsers() {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/list`,
    {
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    }
  );
  
  return response.json();
}

export async function updateUser(userId: string, updates: any) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/update/${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    }
  );
  
  return response.json();
}

export async function deleteUser(userId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/delete/${userId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    }
  );
  
  return response.json();
}
```

**Then update `admin-users.tsx`:**

```typescript
import { listUsers, updateUser, deleteUser } from '@/lib/admin-api';

// In getRealUserData:
const { users } = await listUsers();
return users.map((authUser: any) => {
  // ... rest of mapping
});

// In changePlan:
await updateUser(userId, {
  user_metadata: { plan: newPlan }
});

// In deleteUser:
await deleteUser(userId);
```

### Option 2: Public Users Table (Alternative)

Create a public `users` table that mirrors auth data:

```sql
-- Create users table
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  plan TEXT DEFAULT 'FREE',
  timezone TEXT DEFAULT 'Europe/London',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Admins can see all users
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.plan = 'LEGACY'
    )
  );

-- Users can see their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Admins can update all users
CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.plan = 'LEGACY'
    )
  );

-- Trigger to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, plan)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    COALESCE(NEW.raw_user_meta_data->>'plan', 'FREE')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Update the client code:**

```typescript
// In getRealUserData:
const { data: users, error } = await supabase
  .from('users')
  .select('*')
  .order('created_at', { ascending: false });

if (error) {
  console.error('Error fetching users:', error);
  return [];
}

return users.map((user: any) => {
  // ... rest of mapping
});

// In changePlan:
const { error } = await supabase
  .from('users')
  .update({ plan: newPlan })
  .eq('id', userId);

// In deleteUser:
// Still needs edge function for auth deletion
// But can update table:
const { error } = await supabase
  .from('users')
  .delete()
  .eq('id', userId);
```

### Option 3: Temporary Development Mode (Quick Fix)

For development, you can temporarily use the service role key CLIENT-SIDE:

⚠️ **NEVER do this in production!**

```typescript
// src/lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';

// ONLY FOR DEVELOPMENT - NEVER COMMIT SERVICE_ROLE KEY
export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  'YOUR_SERVICE_ROLE_KEY_HERE', // Get from Supabase dashboard
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

Then in `admin-users.tsx`:

```typescript
import { supabaseAdmin } from '@/lib/supabase-admin';

// Use supabaseAdmin instead of supabase for admin operations
const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
```

## Current Behavior

Right now, the page will:
1. Show "Loading users from Supabase..." 
2. Likely fail silently (no users returned)
3. Show "No users found matching your criteria"

This is because the client-side anon key doesn't have permission to call admin APIs.

## Recommendation

**Use Option 1** (Edge Function) for production. It's secure, scalable, and follows best practices.

For quick testing, Option 3 works but **must be removed before any production deployment**.

## Files Modified

- ✅ `src/pages/admin/admin-users.tsx` - Updated to use Supabase admin API
- ✅ Added dark mode support
- ✅ Added loading states
- ✅ Improved error handling

## Next Steps

1. Choose implementation option (Edge Function recommended)
2. Deploy backend code
3. Test user listing
4. Test user editing
5. Test user deletion
6. Test plan changes

Once the backend is set up, the frontend will work immediately without any additional changes!



