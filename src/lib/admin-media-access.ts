import { supabase } from './supabase';
import { addAuditLog } from './audit-log';

export interface AdminMediaSettings {
  accessLevel: 'stats-only' | 'full-access';
  requireUserPermission: boolean;
  logAllAccess: boolean;
}

export interface UserMediaPermission {
  allowAdminMediaAccess: boolean;
  adminAccessExpiresAt?: string;
  adminAccessGrantedAt?: string;
}

const ADMIN_MEDIA_SETTINGS_KEY = 'admin_media_settings';
const DEFAULT_EXPIRY_HOURS = 48;

// Get admin media access settings
export const getAdminMediaSettings = (): AdminMediaSettings => {
  try {
    const stored = localStorage.getItem(ADMIN_MEDIA_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading admin media settings:', error);
  }
  
  // Default settings
  return {
    accessLevel: 'stats-only',
    requireUserPermission: true,
    logAllAccess: true,
  };
};

// Update admin media access settings
export const updateAdminMediaSettings = (settings: AdminMediaSettings): void => {
  localStorage.setItem(ADMIN_MEDIA_SETTINGS_KEY, JSON.stringify(settings));
  
  addAuditLog(
    'admin_settings_updated',
    'system',
    'media_access',
    { settings }
  );
};

// Check if admin can access a user's media
export const canAdminAccessUserMedia = async (
  userId: string,
  isAdmin: boolean
): Promise<{ canAccess: boolean; reason: string }> => {
  console.log('🔍 canAdminAccessUserMedia called:', { userId, isAdmin });
  
  if (!isAdmin) {
    console.log('❌ Access denied: Not an admin');
    return { canAccess: false, reason: 'Not an admin' };
  }

  const settings = getAdminMediaSettings();
  console.log('⚙️ Admin settings:', settings);

  // If stats-only mode, allow full access when user granted explicit permission (for own account convenience)
  if (settings.accessLevel === 'stats-only') {
    const selfPermission = await hasUserGrantedPermission(userId);
    if (!selfPermission) {
      console.log('📊 Access denied: Stats-only mode');
      return { canAccess: false, reason: 'Admin is in stats-only mode' };
    }
    // Self permission acts as override
    return { canAccess: true, reason: 'Permission granted by user' };
  }

  // If full access mode but requires user permission
  if (settings.requireUserPermission) {
    console.log('🔐 Checking user permission...');
    const hasPermission = await hasUserGrantedPermission(userId);
    console.log('🔐 User permission result:', hasPermission);
    if (!hasPermission) {
      console.log('❌ Access denied: User has not granted permission');
      return { canAccess: false, reason: 'User has not granted permission' };
    }
  }

  console.log('✅ Access granted: Full access');
  return { canAccess: true, reason: 'Full access granted' };
};

// Check if user has granted admin access permission
export const hasUserGrantedPermission = async (userId: string): Promise<boolean> => {
  try {
    if (!supabase) return false;

    // Always check current user first (most common case - admin viewing their own media)
    const { data: currentUserData } = await supabase.auth.getUser();
    if (currentUserData?.user?.id === userId) {
      console.log('Checking permission for current user:', currentUserData.user.user_metadata);
      const metadata = currentUserData.user.user_metadata;
      return checkPermissionFromMetadata(metadata);
    }

    // Try admin API for other users (requires service_role key)
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      
      if (!error && data) {
        return checkPermissionFromMetadata(data.user.user_metadata);
      }
    } catch (adminError) {
      console.log('Admin API not available (expected on client-side)');
    }
    
    // If we can't check permission and it's not the current user, deny access
    return false;
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
};

const checkPermissionFromMetadata = (metadata: any): boolean => {
  console.log('📋 Checking metadata:', metadata);
  
  if (!metadata?.allowAdminMediaAccess) {
    console.log('❌ allowAdminMediaAccess is false or missing');
    return false;
  }

  // Check if permission has expired
  if (metadata.adminAccessExpiresAt) {
    const expiresAt = new Date(metadata.adminAccessExpiresAt);
    const now = new Date();
    console.log('⏰ Expiry check:', { expiresAt, now, expired: expiresAt < now });
    if (expiresAt < now) {
      console.log('❌ Permission expired');
      return false;
    }
  }

  console.log('✅ Permission valid');
  return true;
};

// Grant admin access to user's media
export const grantAdminMediaAccess = async (hours: number = DEFAULT_EXPIRY_HOURS): Promise<boolean> => {
  try {
    if (!supabase) return false;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);
    const grantedAt = new Date();

    const { error } = await supabase.auth.updateUser({
      data: {
        allowAdminMediaAccess: true,
        adminAccessExpiresAt: expiresAt.toISOString(),
        adminAccessGrantedAt: grantedAt.toISOString(),
      }
    });

    if (error) {
      console.error('Error granting admin access:', error);
      return false;
    }

    // Log the action
    addAuditLog(
      'user_granted_admin_access',
      'user',
      'media_permissions',
      { expiresAt: expiresAt.toISOString(), hours }
    );

    return true;
  } catch (error) {
    console.error('Error granting admin access:', error);
    return false;
  }
};

// Revoke admin access to user's media
export const revokeAdminMediaAccess = async (): Promise<boolean> => {
  try {
    if (!supabase) return false;

    const { error } = await supabase.auth.updateUser({
      data: {
        allowAdminMediaAccess: false,
        adminAccessExpiresAt: null,
        adminAccessGrantedAt: null,
      }
    });

    if (error) {
      console.error('Error revoking admin access:', error);
      return false;
    }

    // Log the action
    addAuditLog(
      'user_revoked_admin_access',
      'user',
      'media_permissions',
      {}
    );

    return true;
  } catch (error) {
    console.error('Error revoking admin access:', error);
    return false;
  }
};

// Get user's current permission status
export const getUserPermissionStatus = async (): Promise<UserMediaPermission> => {
  try {
    if (!supabase) {
      return { allowAdminMediaAccess: false };
    }

    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data?.user) {
      return { allowAdminMediaAccess: false };
    }

    const metadata = data.user.user_metadata;
    
    return {
      allowAdminMediaAccess: metadata?.allowAdminMediaAccess || false,
      adminAccessExpiresAt: metadata?.adminAccessExpiresAt,
      adminAccessGrantedAt: metadata?.adminAccessGrantedAt,
    };
  } catch (error) {
    console.error('Error getting permission status:', error);
    return { allowAdminMediaAccess: false };
  }
};

// Log admin media access
export const logAdminMediaAccess = (userId: string, mediaType: 'video' | 'audio' | 'image' | 'file'): void => {
  const settings = getAdminMediaSettings();
  
  if (settings.logAllAccess) {
    addAuditLog(
      'admin_viewed_user_media',
      'user',
      userId,
      { mediaType, timestamp: new Date().toISOString() }
    );
  }
};

// Get media statistics for a user (always allowed for admins)
export interface MediaStats {
  videos: { count: number; totalSize: number };
  audio: { count: number; totalSize: number };
  images: { count: number; totalSize: number };
  other: { count: number; totalSize: number };
  lastUpload?: string;
}

export const getUserMediaStats = async (userId: string): Promise<MediaStats> => {
  try {
    if (!supabase) {
      return {
        videos: { count: 0, totalSize: 0 },
        audio: { count: 0, totalSize: 0 },
        images: { count: 0, totalSize: 0 },
        other: { count: 0, totalSize: 0 },
      };
    }

    const stats: MediaStats = {
      videos: { count: 0, totalSize: 0 },
      audio: { count: 0, totalSize: 0 },
      images: { count: 0, totalSize: 0 },
      other: { count: 0, totalSize: 0 },
    };

    // List files from user's folders
    const folders = ['uploads', 'audio', 'recordings', 'voice'];
    
    for (const folder of folders) {
      try {
        const { data: files } = await supabase.storage
          .from('media')
          .list(`${folder}/${userId}`, {
            limit: 1000,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (files) {
          for (const file of files) {
            const ext = file.name.toLowerCase();
            const size = (file.metadata as any)?.size || 0;

            if (/\.(mp4|webm|mov|m4v|avi|mkv)$/.test(ext)) {
              stats.videos.count++;
              stats.videos.totalSize += size;
            } else if (/\.(mp3|wav|ogg|m4a|aac)$/.test(ext)) {
              stats.audio.count++;
              stats.audio.totalSize += size;
            } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(ext)) {
              stats.images.count++;
              stats.images.totalSize += size;
            } else {
              stats.other.count++;
              stats.other.totalSize += size;
            }

            // Track last upload
            const createdAt = (file.metadata as any)?.lastModified || file.created_at;
            if (createdAt && (!stats.lastUpload || createdAt > stats.lastUpload)) {
              stats.lastUpload = createdAt;
            }
          }
        }
      } catch (error) {
        console.error(`Error listing ${folder}:`, error);
      }
    }

    return stats;
  } catch (error) {
    console.error('Error getting user media stats:', error);
    return {
      videos: { count: 0, totalSize: 0 },
      audio: { count: 0, totalSize: 0 },
      images: { count: 0, totalSize: 0 },
      other: { count: 0, totalSize: 0 },
    };
  }
};

// Format bytes to human-readable string
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

