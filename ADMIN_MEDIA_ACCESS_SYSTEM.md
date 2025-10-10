# Admin Media Access System

## Overview

A comprehensive, privacy-focused system that allows administrators to access user media files for support purposes while maintaining transparency and user control.

## Features Implemented

### ✅ 1. User Privacy Controls
**Location**: User Profile Page → Privacy & Media Access section

Users can:
- **Grant temporary access** to their media files (48-hour expiration)
- **Revoke access** at any time
- **View expiration time** for active permissions
- **See what admins can/cannot access**

**How it works:**
- Toggle the "Allow Admin Media Access" switch
- Permission is stored in user metadata in Supabase
- Automatically expires after 48 hours
- All actions are logged in the audit trail

### ✅ 2. Admin Configuration Panel
**Location**: Admin Profile → Security Tab → Media Access Control

Admins can configure:

#### **Access Level** (Toggle-able):
1. **Stats Only** (Recommended, Default)
   - Admins can ONLY see file counts and storage sizes
   - Cannot view or download actual media files
   - No user permission required
   - Best for privacy

2. **Full Access** (Support Mode)
   - Admins can view and download user media files
   - Requires user permission (if enabled)
   - Useful for troubleshooting media issues
   - All access is logged

#### **Additional Options**:
- **Require User Permission**: Force users to grant access before viewing (recommended)
- **Log All Access**: Record every admin media access in audit logs (recommended)

### ✅ 3. Admin User Media Viewer
**Location**: Admin → Users → [Media] button

When viewing a user's media:
- **Always visible**: File counts and storage statistics
- **Conditionally visible** (Full Access mode + permission):
  - Actual media files
  - Preview capabilities (images, videos, audio)
  - Download functionality
  - File details (name, size, upload date)
  
**Features**:
- Filter by type (All, Video, Audio, Images, Other)
- Preview media in-app before downloading
- Clear permission status banner
- Organized grid layout

### ✅ 4. Audit Logging
**Location**: Admin Profile → Security Tab → Audit Logs

All actions are logged:
- User granting/revoking admin access
- Admin viewing user media
- Admin downloading files
- Admin changing access settings

**Audit Log Details**:
- Timestamp
- Action type
- User ID affected
- Media type accessed (if applicable)

### ✅ 5. Permission Management
**Storage**: Supabase user metadata
**Fields**:
```typescript
{
  allowAdminMediaAccess: boolean
  adminAccessExpiresAt: string (ISO date)
  adminAccessGrantedAt: string (ISO date)
}
```

**Auto-expiry**: Permissions automatically expire after 48 hours

## User Flow

### For Regular Users:

1. **Need Help with Media?**
   - Go to Profile → Privacy & Media Access
   - Toggle "Allow Admin Media Access" ON
   - System shows expiration time (48 hours)

2. **After Support is Done:**
   - Toggle "Allow Admin Media Access" OFF
   - Or wait for automatic expiration

### For Admins:

1. **Configure Access Level**
   - Go to Admin Profile → Security → Media Access Control
   - Choose: "Stats Only" or "Full Access"
   - Enable/disable "Require User Permission"
   - Enable "Log All Access" for transparency

2. **View User Media**
   - Go to Admin → Users
   - Click [Media] button next to any user
   - See statistics (always available)
   - If Full Access + permission: view/download files

3. **Support Workflow**
   - User reports media issue
   - User grants temporary access
   - Admin views media to diagnose
   - Admin helps resolve issue
   - Access auto-expires or user revokes

## Security Features

### 🔒 Privacy Protection
- **Default: Stats Only** - Admins cannot see actual files
- **User consent required** - Users must explicitly grant access
- **Auto-expiry** - Permissions expire after 48 hours
- **Revocable** - Users can revoke access anytime

### 📝 Transparency
- **Audit logging** - All access is recorded
- **Clear indicators** - Users see exactly what admins can access
- **Status badges** - Clear visual feedback on permission state

### 🛡️ Access Control
- **Two-tier system**: Stats-only vs Full-access
- **Permission checks** - Verified before every access
- **Email whitelist** - Only authorized admins
- **Supabase security** - Leverages existing RLS policies

## Technical Implementation

### Core Library
**File**: `src/lib/admin-media-access.ts`

**Functions**:
```typescript
// Permission Management
grantAdminMediaAccess(hours: number): Promise<boolean>
revokeAdminMediaAccess(): Promise<boolean>
getUserPermissionStatus(): Promise<UserMediaPermission>
hasUserGrantedPermission(userId: string): Promise<boolean>

// Access Control
canAdminAccessUserMedia(userId: string, isAdmin: boolean): Promise<{canAccess, reason}>
getAdminMediaSettings(): AdminMediaSettings
updateAdminMediaSettings(settings: AdminMediaSettings): void

// Statistics
getUserMediaStats(userId: string): Promise<MediaStats>
formatBytes(bytes: number): string

// Audit
logAdminMediaAccess(userId: string, mediaType: string): void
```

### Components
1. **User Privacy Toggle**: `src/pages/dashboard/profile.tsx`
2. **Admin Settings Panel**: `src/pages/admin/admin-profile.tsx`
3. **Media Viewer Dialog**: `src/components/admin/admin-media-viewer.tsx`
4. **Admin Users Integration**: `src/pages/admin/admin-users.tsx`

### Data Storage
- **Admin Settings**: localStorage (`admin_media_settings`)
- **User Permissions**: Supabase user_metadata
- **Audit Logs**: localStorage (`audit_logs`)
- **Media Files**: Supabase Storage (`media/{folder}/{userId}/`)

## Configuration Examples

### Example 1: Maximum Privacy (Default)
```
Access Level: Stats Only
Require Permission: Enabled (grayed out)
Log All Access: Enabled

Result: Admins can only see file counts and sizes.
```

### Example 2: Support Mode with User Control
```
Access Level: Full Access
Require Permission: Enabled
Log All Access: Enabled

Result: Admins can view files ONLY if user grants permission.
        All access is logged.
```

### Example 3: Unrestricted Admin (Not Recommended)
```
Access Level: Full Access
Require Permission: Disabled
Log All Access: Enabled

Result: Admins can view all media without user permission.
        Use only in trusted environments.
```

## Best Practices

### For Admins:
1. ✅ Keep "Require User Permission" ENABLED
2. ✅ Keep "Log All Access" ENABLED
3. ✅ Use "Stats Only" by default
4. ✅ Switch to "Full Access" only when needed
5. ✅ Review audit logs regularly
6. ✅ Ask users to grant access before viewing

### For Users:
1. ✅ Only grant access when you need help
2. ✅ Revoke access after your issue is resolved
3. ✅ Check the expiration time
4. ✅ Review what admins can see (in the info box)

## Troubleshooting

### User Can't See Media in Dashboard
**Cause**: Media security fix - files are now user-specific
**Solution**: Use the migration tool (Dashboard → Migrate Media)

### Admin Can't View User Media
**Possible causes**:
1. Access Level set to "Stats Only" → Switch to "Full Access"
2. User hasn't granted permission → Ask user to enable access
3. Permission expired → Ask user to re-grant access
4. Admin not whitelisted → Check email in admin whitelist

### Permission Not Saving
**Cause**: Supabase auth issue
**Solution**: 
1. Check browser console for errors
2. Verify Supabase connection
3. Try logging out and back in

### Audit Logs Not Recording
**Cause**: "Log All Access" is disabled
**Solution**: Go to Admin Profile → Security → Media Access Control → Enable "Log All Access"

## Future Enhancements

### Potential Additions:
- [ ] Email notifications when admin accesses media
- [ ] Custom expiration times (1 hour, 24 hours, 7 days)
- [ ] Granular permissions (videos only, images only, etc.)
- [ ] Admin request system (user approves specific requests)
- [ ] Real-time notifications when admin is viewing
- [ ] Download limits (prevent bulk downloading)
- [ ] Watermark on previewed images

## Summary

This system provides a **balanced approach** to admin media access:

**For Users**:
- 🔐 Privacy by default
- 🎛️ Full control over access
- ⏰ Auto-expiring permissions
- 👁️ Transparency on what admins can see

**For Admins**:
- 📊 Always see statistics
- 🔧 Optional full access for support
- 🛠️ Configurable access levels
- 📝 Comprehensive audit trail

**For Everyone**:
- ✅ GDPR-friendly
- ✅ Transparent and logged
- ✅ Easy to use
- ✅ Secure by default

---

**Status**: ✅ Fully Implemented and Functional

**Last Updated**: October 8, 2025



