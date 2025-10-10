# Admin Users - Profile Image Fix

## The Problem

Profile images were not showing in the Admin Users list, even though they were stored correctly in Supabase Auth `user_metadata`.

### Root Cause

The code was trying to fetch user images using `supabase.auth.admin.getUserById()`, which requires a **service_role key** (server-side only). On the client side, this call fails with "User not allowed" error, resulting in no images being loaded.

### Evidence from Console Logs

```
✅ Found profile image in user_metadata: https://cvhanylywsdeblhebicj.supabase.co/...  
```
(Image exists in auth metadata)

```
📸 Image for davwez@gmail.com: none  
```
(Image not loaded due to admin API failure)

```
🖼️ Rendering user davwez with image: undefined  
```
(No image displayed)

---

## The Solution

### For the Current User
Since we can't use the admin API to fetch other users' images, we now:

1. **Get the current user's image from the auth context** (already loaded)
2. **For other users**, show initials (admin API required for their images)

### Code Changes

#### 1. Profiles Table Path (Lines 139-166)
Instead of using `admin.getUserById()` (which fails), we now:
- Get the current auth user with `supabase.auth.getUser()`
- Check if each profile matches the current user
- If yes, use their image from `user_metadata`
- If no, show initials (requires backend admin API)

```typescript
const { data: { user: currentAuthUser } } = await supabase.auth.getUser();

allUsers = profilesData.map((profile: any) => {
  let userImage = undefined;
  
  // If this is the current user, get their image from auth metadata
  if (profile.id === currentAuthUser?.id && currentAuthUser?.user_metadata?.image) {
    userImage = currentAuthUser.user_metadata.image;
  }
  
  return {
    ...profile,
    user_metadata: {
      ...profile.user_metadata,
      image: userImage
    }
  };
});
```

#### 2. Main Processing Path (Lines 336-343)
As a fallback, also check if the user being processed is the current user and get their image from the auth context:

```typescript
let userImage = authUser.user_metadata?.image;
if (!userImage && authUser.id === currentUser?.id && currentUser?.image) {
  userImage = currentUser.image;
  console.log(`📸 Using image from auth context for ${authUser.email}:`, userImage);
}
```

---

## Result

### Current Behavior
- ✅ **Current user (you)**: Profile image displays correctly
- ⚠️ **Other users**: Show colorful initials (requires backend admin API for their images)

### Future Enhancement
To show images for ALL users, you need to:

**Option 1: Backend Admin API** (Recommended)
- Set up a server-side Edge Function
- Use `service_role` key to access admin API
- Return user data with images

**Option 2: Store Images in Profiles Table**
- Add an `image` column to the `profiles` table
- Sync image URLs when users update their profiles
- Query images directly from profiles table

**Option 3: Public Avatar Service**
- Use a public avatar service (Gravatar, etc.)
- Generate avatar URLs from email hashes
- No admin API required

---

## Console Logs (After Fix)

You should now see:
```
📸 Image for davwez@gmail.com (current user): https://...your-image-url...
🖼️ Rendering user davwez with image: https://...your-image-url...
```

Instead of:
```
📸 Image for davwez@gmail.com: none
🖼️ Rendering user davwez with image: undefined
```

---

## Files Modified

### `src/pages/admin/admin-users.tsx`

1. **Lines 139-166**: Updated profiles table mapping
   - Get current user from `supabase.auth.getUser()`
   - Check if profile matches current user
   - Include image for current user only

2. **Lines 336-343**: Added fallback for image loading
   - Check if processing current user
   - Use image from auth context if available
   - Log where image came from

3. **Line 398**: Made `saveUser` async
   - Fixed to support `await getRealUserData()`

---

## Testing

1. **Refresh the Admin Users page**
2. **Your profile image should now display** (the cat/anime character)
3. **Other users will show initials** until admin API is set up

---

## Next Steps

If you want to show images for ALL users (not just yourself), you have these options:

### Option 1: Store Images in Profiles Table (Easiest)
Run this SQL in Supabase:
```sql
-- Add image column to profiles table
ALTER TABLE public.profiles ADD COLUMN image TEXT;

-- Update trigger to include image
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, plan, image)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'plan', 'FREE'),
    NEW.raw_user_meta_data->>'image'  -- Include image
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing users
UPDATE public.profiles p
SET image = (
  SELECT raw_user_meta_data->>'image'
  FROM auth.users u
  WHERE u.id = p.id
);
```

Then update the Admin Users page to read from `profile.image` instead of `user_metadata.image`.

### Option 2: Backend Admin API (Most Secure)
See `USER_MANAGEMENT_SETUP.md` for full instructions on setting up the admin API with Edge Functions.

---

## Summary

✅ **Fixed**: Current user's profile image now displays in Admin Users list  
⚠️ **Limitation**: Other users show initials (requires backend admin API or profiles table update)  
📝 **Recommendation**: Add `image` column to profiles table for easiest solution



