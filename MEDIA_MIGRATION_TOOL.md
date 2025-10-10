# Media Migration Tool - User Guide

## Overview
The Media Migration Tool helps you move your old media files from shared root folders to your private, user-specific folders.

## Why Migrate?

### Before Security Update:
- All files stored in shared root folders: `uploads/`, `audio/`, `recordings/`, `voice/`
- ❌ Everyone could see everyone's files
- ❌ No privacy or user separation
- ❌ Security risk

### After Security Update:
- Files stored in user-specific folders: `uploads/{your-user-id}/`
- ✅ Each user sees ONLY their own files
- ✅ Complete privacy and isolation
- ✅ Secure and compliant

## How to Access

### Method 1: Dashboard Button
1. Go to your Dashboard
2. Click the **"Migrate Media"** button at the top
3. The migration tool will open

### Method 2: Direct URL
Navigate to: `https://your-site.com/dashboard/migrate-media`

## How It Works

### Step 1: Automatic Scan
- Automatically scans root folders for legacy files
- Shows all files found in shared folders
- Displays file type, name, and current location

### Step 2: Select Files
- All files are pre-selected by default
- You can:
  - **Select All** - Migrate all found files
  - **Deselect All** - Start fresh
  - **Individually select** - Pick specific files

### Step 3: Migrate
Click the **"Migrate Selected Files"** button to start the process:

1. **Download** - Each file is downloaded from its current location
2. **Upload** - File is uploaded to your user-specific folder
3. **Delete** - Original file is removed from shared folder
4. **Verify** - Process continues to next file

### Progress Tracking
- See real-time progress bar
- Watch file count: "Migrating 5/20..."
- Individual file status indicators:
  - ✅ **Green checkmark** - Successfully migrated
  - ⚠️ **Red warning** - Migration failed (hover for details)

## File Organization

### Before Migration:
```
media/
  uploads/
    ├─ my-video.mp4       ← Everyone can see
    ├─ your-photo.jpg     ← Everyone can see
  audio/
    └─ my-recording.webm  ← Everyone can see
```

### After Migration:
```
media/
  uploads/
    └─ {your-user-id}/
       ├─ my-video.mp4       ← Only you can see
       └─ your-photo.jpg     ← Only you can see
  audio/
    └─ {your-user-id}/
       └─ my-recording.webm  ← Only you can see
```

## Supported File Types

The tool migrates ALL file types:
- 📹 **Videos**: mp4, webm, mov, m4v, avi, mkv
- 🎵 **Audio**: mp3, wav, ogg, m4a, aac, webm
- 🖼️ **Images**: jpg, jpeg, png, gif, webp, svg
- 📄 **Documents**: pdf, doc, txt, and any other files

## Results Summary

After migration completes, you'll see:
- ✅ **Successfully Migrated**: Count of files moved successfully
- ❌ **Failed**: Count of files that couldn't be migrated (if any)

## Important Notes

### ✅ Safe Process
- Original files are only deleted AFTER successful upload
- If migration fails, original file remains untouched
- You can retry failed files anytime

### 🔄 Re-running Migration
- You can run the tool multiple times
- Already-migrated files won't appear again
- New legacy files will be detected

### ⚠️ What If Migration Fails?
If some files fail to migrate:
1. Check the error message (hover over the red warning icon)
2. Common issues:
   - Network connectivity
   - Storage permissions
   - File size limits
3. Simply run the migration again to retry

### 🚀 After Migration
Once migration is complete:
- Refresh your Dashboard
- Your media will appear in all galleries
- All new uploads automatically go to your private folder

## Verification

To verify migration worked:

1. **Dashboard Check**
   - Go to Dashboard
   - Check Video Messages, Audio Messages, and Files sections
   - You should now see your migrated media

2. **Media Library Check**
   - Go to Media Library (top navbar)
   - Your files should be organized by type
   - All files should be in user-specific folders

3. **Path Verification**
   - Hover over any file to see its path
   - Should show: `uploads/{your-user-id}/filename.ext`

## Troubleshooting

### "No legacy files found"
✅ **This is good!** It means:
- All your files are already in your private folder, OR
- You had no files in shared folders

### Files still not appearing after migration
1. **Refresh your browser** (Ctrl+F5 or Cmd+Shift+R)
2. **Clear cache**: Try hard refresh
3. **Check migration results**: Did all files migrate successfully?
4. **Verify you're logged in** as the correct user

### Migration keeps failing
1. **Check your internet connection**
2. **Try migrating fewer files** at once
3. **Check Supabase storage limits** in your project settings
4. **Contact support** if issues persist

## Best Practices

### Before Migration
- ✅ Review the file list to ensure they're yours
- ✅ Note the file count for verification
- ✅ Ensure stable internet connection

### During Migration
- ✅ Keep the page open until complete
- ✅ Don't refresh or close the browser
- ✅ Monitor the progress bar

### After Migration
- ✅ Verify all files appear in galleries
- ✅ Test playing/viewing a few files
- ✅ You can safely close the migration tool

## FAQ

**Q: Will this affect my messages?**
A: No, messages remain unchanged. Only media files are moved.

**Q: Can other users see my files during migration?**
A: No, only you can see and access your files.

**Q: How long does migration take?**
A: Depends on file count and size. Typically:
- Small files (< 1MB): ~2-5 seconds each
- Medium files (1-10MB): ~5-15 seconds each
- Large files (> 10MB): ~15-60 seconds each

**Q: Can I cancel migration?**
A: You can close the page, but files already migrated won't be rolled back. It's safe to restart later.

**Q: What if I accidentally migrate someone else's files?**
A: The tool only shows and migrates files from shared folders. If multiple users' files are mixed in root folders, you might see files that aren't yours. Only migrate files you recognize as your own.

**Q: Do I need to run this every time I log in?**
A: No! This is a **one-time** migration. Once complete, all future uploads automatically go to your private folder.

---

## Need Help?

If you encounter issues:
1. Check the error messages in the results section
2. Try the troubleshooting steps above
3. Contact your system administrator
4. Check browser console for technical errors

**Status**: ✅ Migration tool is ready to use!

**Location**: Dashboard → "Migrate Media" button



