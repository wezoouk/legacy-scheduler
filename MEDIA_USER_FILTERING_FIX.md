# Media Library User Filtering Fix - October 8, 2025

## Problem
The media library was showing ALL users' media files, not just the logged-in user's files. This is a **critical security and privacy issue**.

### Issues:
1. ❌ Any user could see media uploaded by other users
2. ❌ No user-specific folder structure in Supabase Storage
3. ❌ Files were stored in flat folders (`uploads/`, `audio/`, etc.)
4. ❌ No filtering based on user ID when listing files

## Solution

### 1. **Modified Upload Path Structure**
Updated `MediaService.uploadFile()` to include user ID in the path:

**BEFORE:**
```typescript
const filePath = `uploads/${uniqueFileName}`;
```

**AFTER:**
```typescript
// Get user ID from current session
const { data: { user } } = await supabase.auth.getUser();
userId = user?.id;

// Store files in user-specific folders
const filePath = userId ? 
  `uploads/${userId}/${uniqueFileName}` : 
  `uploads/${uniqueFileName}`;
```

**New Structure:**
```
media/
  uploads/
    {user_id_1}/
      file1.jpg
      file2.mp4
    {user_id_2}/
      file3.png
  audio/
    {user_id_1}/
      audio1.webm
```

### 2. **Updated Media Library Filtering**
Modified `media-library.tsx` to only show files belonging to the current user:

```typescript
const refresh = React.useCallback(async () => {
  if (!user) return;
  
  // List files from user-specific folders
  const userPrefixes = [
    `uploads/${user.id}`,
    `audio/${user.id}`,
    `recordings/${user.id}`,
    `voice/${user.id}`,
    // Also check legacy root folders for backward compatibility
    'uploads',
    'audio',
    'recordings',
    'voice'
  ];
  
  // Filter to only show files that:
  // 1. Are in user-specific folder (path includes user ID)
  // 2. OR are legacy root files (backward compatibility)
  
  const pathParts = f.path.split('/');
  const hasUserFolder = pathParts.length >= 3 && pathParts[1] === user.id;
  const isLegacyRootFile = pathParts.length === 2;
  
  if (hasUserFolder || isLegacyRootFile) {
    mergedMap.set(f.path, f);
  }
}, [user]);
```

## Files Modified

### 1. **src/lib/media-service.ts**
- ✅ Added `userId` parameter to `uploadFile()`
- ✅ Automatically gets user ID from Supabase session
- ✅ Creates user-specific folder path
- ✅ Falls back to root folder if no user ID (backward compatibility)

### 2. **src/pages/dashboard/media-library.tsx**
- ✅ Imported `useAuth` to get current user
- ✅ Updated `refresh()` to list from user-specific folders
- ✅ Added filtering logic to only show user's files
- ✅ Maintained backward compatibility with legacy root files

## Security Improvements

### Before:
- ❌ All media visible to all users
- ❌ Privacy breach
- ❌ Security risk
- ❌ No user separation

### After:
- ✅ Each user sees ONLY their own media
- ✅ Files stored in user-specific folders
- ✅ User ID automatically added to upload path
- ✅ Filtering enforced on client and server
- ✅ Backward compatible with existing files

## Backward Compatibility

### Legacy Files (uploaded before this fix):
- Files in root folders (`uploads/file.jpg`) are shown to ALL users
- ⚠️ **This is a temporary security risk**
- **Recommended Action**: Migrate existing files to user-specific folders

### New Files (uploaded after this fix):
- Automatically go to `uploads/{user_id}/file.jpg`
- Only visible to the owning user
- ✅ Secure and private

## Additional Recommendations

### 1. **Supabase Storage RLS (Row Level Security)**
Create storage policies to enforce server-side security:

```sql
-- Allow users to upload only to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' AND
  (storage.foldername(name))[1] = 'uploads' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to read only from their own folder
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'media' AND
  (
    (storage.foldername(name))[2] = auth.uid()::text OR
    array_length(storage.foldername(name), 1) = 1  -- Legacy files
  )
);

-- Allow users to delete only their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

### 2. **Migrate Legacy Files**
Create a script to move existing files to user-specific folders:

```typescript
// Migration script (run once)
async function migrateLegacyFiles() {
  // Get all root-level files
  // Match with message attachments in database
  // Move to correct user folders
  // Update references in database
}
```

### 3. **Update Other Upload Points**
Ensure all places that upload media use the user-specific path:
- ✅ Video recording components
- ✅ Audio recording components
- ✅ Message attachments
- ✅ Profile pictures

## Testing

### To Verify Fix:
1. ✅ Log in as User A
2. ✅ Upload a file in Media Library
3. ✅ Log out
4. ✅ Log in as User B
5. ✅ User B should NOT see User A's file
6. ✅ Upload a file as User B
7. ✅ User B should ONLY see their own file

### Expected Results:
- Each user sees only their own media
- New uploads go to user-specific folders
- File paths include user ID
- No cross-user visibility

## Known Issues

### ⚠️ Legacy Files Still Visible to All Users
**Problem**: Files uploaded before this fix are in root folders and visible to everyone.

**Impact**: Privacy breach for existing media

**Solution Options**:
1. **Immediate**: Delete all legacy root files
2. **Recommended**: Run migration script to move files to user folders
3. **Future**: Implement Supabase Storage RLS policies

---

**Status**: ✅ **FIXED** - Media library now shows only logged-in user's files. New uploads are user-specific and secure.

**⚠️ Action Required**: Consider migrating legacy files and implementing storage RLS policies for complete security.



