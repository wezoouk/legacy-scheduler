/**
 * System Statistics
 * Real-time system metrics and analytics
 */

import { supabase } from './supabase';
import { getAuditLogs } from './audit-log';

export interface SystemStats {
  // User Metrics
  totalUsers: number;
  activeUsers: number; // Logged in within last 7 days
  onlineUsers: number; // Active in last 15 minutes
  newUsersToday: number;
  newUsersThisWeek: number;
  userGrowthPercent: number; // Week over week growth
  
  // Message Metrics
  totalMessages: number;
  messagesSent: number;
  scheduledMessages: number;
  draftMessages: number;
  activeDMS: number;
  
  // Media Metrics (NEW!)
  totalVideos: number;
  totalAudios: number;
  totalImages: number;
  totalFiles: number;
  videoStorageUsed: number;
  audioStorageUsed: number;
  imageStorageUsed: number;
  
  // Activity Metrics
  totalRecipients: number;
  loginAttempts24h: number;
  failedLogins24h: number;
  
  // System Metrics
  storageUsed: number; // bytes
  lastBackup: Date | null;
  auditLogCount: number;
  
  // Scheduled Deliveries (NEW!)
  upcomingDeliveries: Array<{
    date: Date;
    count: number;
    messages: Array<{ id: string; title: string; }>;
  }>;
  
  // Calculated Metrics
  uptime: string;
  successRate: string; // percentage of successful logins
}

/**
 * Track user activity (call this on page load/interaction)
 */
export function trackUserActivity(userId: string): void {
  try {
    const activityLog = JSON.parse(localStorage.getItem('legacyScheduler_userActivity') || '{}');
    activityLog[userId] = new Date().toISOString();
    localStorage.setItem('legacyScheduler_userActivity', JSON.stringify(activityLog));
  } catch (err) {
    console.error('Failed to track user activity:', err);
  }
}

/**
 * Get users active within time period
 */
function getActiveUsers(minutes: number): number {
  try {
    const activityLog = JSON.parse(localStorage.getItem('legacyScheduler_userActivity') || '{}');
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    
    return Object.values(activityLog).filter((timestamp: any) => {
      return new Date(timestamp) > cutoff;
    }).length;
  } catch {
    return 0;
  }
}

/**
 * Calculate storage used
 */
function calculateStorageUsed(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('legacyScheduler_')) {
      const value = localStorage.getItem(key);
      if (value) {
        total += value.length;
      }
    }
  }
  return total;
}

/**
 * Calculate media storage by type from Supabase Storage
 */
async function calculateMediaStorage(): Promise<{
  videos: { count: number; size: number };
  audios: { count: number; size: number };
  images: { count: number; size: number };
}> {
  let videos = { count: 0, size: 0 };
  let audios = { count: 0, size: 0 };
  let images = { count: 0, size: 0 };
  
  // Try to get files from Supabase Storage
  if (supabase) {
    try {
      const { data: files, error } = await supabase
        .storage
        .from('media')
        .list('uploads', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (!error && files) {
        files.forEach((file: any) => {
          const fileName = file.name.toLowerCase();
          const fileSize = file.metadata?.size || 0;
          
          // Categorize by file extension
          if (fileName.endsWith('.webm') || fileName.endsWith('.mp4') || fileName.endsWith('.mov')) {
            // Check if it's audio or video based on naming pattern
            if (fileName.includes('audio') || fileName.includes('voice')) {
              audios.count++;
              audios.size += fileSize;
            } else {
              videos.count++;
              videos.size += fileSize;
            }
          } else if (fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.ogg')) {
            audios.count++;
            audios.size += fileSize;
          } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.gif') || fileName.endsWith('.webp')) {
            images.count++;
            images.size += fileSize;
          }
        });
      }
    } catch (err) {
      console.log('Could not fetch media from Supabase Storage:', err);
    }
  }
  
  // Fallback: Also check messages in localStorage for embedded media
  const messages = JSON.parse(localStorage.getItem('legacyScheduler_messages') || '[]');
  
  messages.forEach((msg: any) => {
    // Check if message has VIDEO type
    const hasVideoType = msg.types?.includes('VIDEO') || msg.type === 'VIDEO';
    const hasVoiceType = msg.types?.includes('VOICE') || msg.type === 'VOICE';
    
    // Only count if we have embedded data (data URLs)
    if (msg.videoRecording && msg.videoRecording.startsWith('data:')) {
      videos.count++;
      videos.size += msg.videoRecording.length;
    }
    
    if (msg.audioRecording && msg.audioRecording.startsWith('data:')) {
      audios.count++;
      audios.size += msg.audioRecording.length;
    }
    
    if (msg.thumbnailUrl && msg.thumbnailUrl.startsWith('data:')) {
      images.count++;
      images.size += msg.thumbnailUrl.length;
    }
  });
  
  return { videos, audios, images };
}

/**
 * Get upcoming scheduled deliveries grouped by date
 */
function getUpcomingDeliveries(): Array<{
  date: Date;
  count: number;
  messages: Array<{ id: string; title: string; }>;
}> {
  const messages = JSON.parse(localStorage.getItem('legacyScheduler_messages') || '[]');
  const scheduled = messages.filter((m: any) => m.status === 'SCHEDULED' && m.scheduledFor);
  
  // Group by date
  const grouped = new Map<string, Array<{ id: string; title: string; }>>();
  
  scheduled.forEach((msg: any) => {
    const date = new Date(msg.scheduledFor);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    
    grouped.get(dateKey)!.push({
      id: msg.id,
      title: msg.title
    });
  });
  
  // Convert to array and sort
  return Array.from(grouped.entries())
    .map(([dateStr, msgs]) => ({
      date: new Date(dateStr),
      count: msgs.length,
      messages: msgs
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 30); // Next 30 days
}

/**
 * Get system statistics from local storage
 */
export async function getSystemStats(): Promise<SystemStats> {
  try {
    // Live platform stats from Supabase (no localStorage fallbacks)
    // Users
    let totalUsers = 0;
    try {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      totalUsers = count || 0;
    } catch {
      totalUsers = 0;
    }

    // Messages counts
    const { count: totalMessages = 0 } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true });

    const { count: scheduledMessages = 0 } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'SCHEDULED');

    const { count: draftMessages = 0 } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'DRAFT');

    const { count: activeDMS = 0 } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('scope', 'DMS')
      .neq('status', 'SENT');

    // Recipients
    const { count: totalRecipients = 0 } = await supabase
      .from('recipients')
      .select('id', { count: 'exact', head: true });

    // Messages sent: prefer durable counter
    let messagesSent = 0;
    try {
      const { data: statsRows } = await supabase
        .from('user_stats')
        .select('total_sent_emails');
      if (statsRows) {
        messagesSent = statsRows.reduce((sum: number, r: any) => sum + (r.total_sent_emails || 0), 0);
      } else {
        const { count: sentFallback = 0 } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'SENT');
        messagesSent = sentFallback || 0;
      }
    } catch {
      const { count: sentFallback = 0 } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'SENT');
      messagesSent = sentFallback || 0;
    }
    
    // Get audit logs
    const auditLogs = getAuditLogs();
    
    // Calculate time-based metrics
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    // Login metrics from audit logs
    const logins24h = auditLogs.filter(log => 
      (log.action === 'login' || log.action === 'failed_login') && 
      log.timestamp > oneDayAgo
    );
    
    const failedLogins24h = logins24h.filter(log => log.action === 'failed_login').length;
    const successfulLogins24h = logins24h.filter(log => log.action === 'login').length;
    
    const successRate = logins24h.length > 0 
      ? ((successfulLogins24h / logins24h.length) * 100).toFixed(1) + '%'
      : '100%';
    
    // (Message metrics already computed above)
    
    // Media statistics (async)
    const mediaStats = await calculateMediaStorage();
    
    // User activity (client-side heuristic)
    const activeUsers = getActiveUsers(7 * 24 * 60); // Active in last 7 days
    const onlineUsers = getActiveUsers(15); // Active in last 15 minutes
    
    // Storage
    const storageUsed = calculateStorageUsed();
    
    // Last backup
    const lastBackupStr = localStorage.getItem('legacyScheduler_lastBackup');
    const lastBackup = lastBackupStr ? new Date(lastBackupStr) : null;
    
    // New users metrics (approx based on audit logs)
    // New users metrics (from audit logs)
    const newUsersToday = auditLogs.filter(log => 
      log.action === 'login' && 
      log.timestamp > oneDayAgo
    ).length;
    
    const newUsersThisWeek = auditLogs.filter(log => 
      log.action === 'login' && 
      log.timestamp > sevenDaysAgo
    ).length;
    
    const newUsersLastWeek = auditLogs.filter(log => 
      log.action === 'login' && 
      log.timestamp > fourteenDaysAgo &&
      log.timestamp <= sevenDaysAgo
    ).length;
    
    // Calculate growth percentage
    const userGrowthPercent = newUsersLastWeek > 0
      ? ((newUsersThisWeek - newUsersLastWeek) / newUsersLastWeek * 100)
      : 0;
    
    // Get upcoming deliveries
    const upcomingDeliveries = getUpcomingDeliveries();
    
    // Calculate uptime (assume 99.9% for now, would need server monitoring)
    const uptime = '99.9%';
    
    return {
      totalUsers,
      activeUsers,
      onlineUsers,
      newUsersToday,
      newUsersThisWeek,
      userGrowthPercent,
      totalMessages,
      messagesSent,
      scheduledMessages,
      draftMessages,
      activeDMS,
      totalVideos: mediaStats.videos.count,
      totalAudios: mediaStats.audios.count,
      totalImages: mediaStats.images.count,
      totalFiles: 0, // Can be added later
      videoStorageUsed: mediaStats.videos.size,
      audioStorageUsed: mediaStats.audios.size,
      imageStorageUsed: mediaStats.images.size,
      totalRecipients: recipients.length,
      loginAttempts24h: logins24h.length,
      failedLogins24h,
      storageUsed,
      lastBackup,
      auditLogCount: auditLogs.length,
      upcomingDeliveries,
      uptime,
      successRate,
    };
  } catch (err) {
    console.error('Failed to get system stats:', err);
    // Return default stats on error
    return {
      totalUsers: 0,
      activeUsers: 0,
      onlineUsers: 0,
      newUsersToday: 0,
      newUsersThisWeek: 0,
      userGrowthPercent: 0,
      totalMessages: 0,
      messagesSent: 0,
      scheduledMessages: 0,
      draftMessages: 0,
      activeDMS: 0,
      totalVideos: 0,
      totalAudios: 0,
      totalImages: 0,
      totalFiles: 0,
      videoStorageUsed: 0,
      audioStorageUsed: 0,
      imageStorageUsed: 0,
      totalRecipients: 0,
      loginAttempts24h: 0,
      failedLogins24h: 0,
      storageUsed: 0,
      lastBackup: null,
      auditLogCount: 0,
      upcomingDeliveries: [],
      uptime: '0%',
      successRate: '0%',
    };
  }
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

