/**
 * System Backup Utilities
 * Handles exporting and backing up system data
 */

import { addAuditLog } from './audit-log';

export interface BackupData {
  version: string;
  timestamp: string;
  data: {
    users?: any[];
    messages?: any[];
    recipients?: any[];
    settings?: any;
    auditLogs?: any[];
  };
}

/**
 * Create a full system backup
 */
export async function createSystemBackup(userId: string, userEmail: string): Promise<BackupData> {
  try {
    const backup: BackupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: {
        users: getLocalStorageItem('legacyScheduler_user'),
        messages: getLocalStorageItem('legacyScheduler_messages') || [],
        recipients: getLocalStorageItem('legacyScheduler_recipients') || [],
        settings: {
          siteSettings: getLocalStorageItem('legacyScheduler_siteSettings'),
          adminSettings: getLocalStorageItem('legacyScheduler_adminSettings'),
        },
        auditLogs: getLocalStorageItem('legacyScheduler_auditLog') || [],
      },
    };

    // Log the backup action
    addAuditLog(userId, userEmail, 'system_backup', 'success', 'Full system backup created');

    return backup;
  } catch (err) {
    console.error('Failed to create backup:', err);
    addAuditLog(userId, userEmail, 'system_backup', 'failure', `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    throw err;
  }
}

/**
 * Download backup as JSON file
 */
export function downloadBackup(backup: BackupData, filename?: string): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Restore from backup
 */
export async function restoreFromBackup(
  backupData: BackupData,
  userId: string,
  userEmail: string
): Promise<void> {
  try {
    if (!backupData.data) {
      throw new Error('Invalid backup data');
    }

    // Restore each data type
    if (backupData.data.users) {
      localStorage.setItem('legacyScheduler_user', JSON.stringify(backupData.data.users));
    }
    if (backupData.data.messages) {
      localStorage.setItem('legacyScheduler_messages', JSON.stringify(backupData.data.messages));
    }
    if (backupData.data.recipients) {
      localStorage.setItem('legacyScheduler_recipients', JSON.stringify(backupData.data.recipients));
    }
    if (backupData.data.settings?.siteSettings) {
      localStorage.setItem('legacyScheduler_siteSettings', JSON.stringify(backupData.data.settings.siteSettings));
    }
    if (backupData.data.settings?.adminSettings) {
      localStorage.setItem('legacyScheduler_adminSettings', JSON.stringify(backupData.data.settings.adminSettings));
    }
    if (backupData.data.auditLogs) {
      localStorage.setItem('legacyScheduler_auditLog', JSON.stringify(backupData.data.auditLogs));
    }

    addAuditLog(userId, userEmail, 'system_backup', 'success', `System restored from backup (${backupData.timestamp})`);
  } catch (err) {
    console.error('Failed to restore backup:', err);
    addAuditLog(userId, userEmail, 'system_backup', 'failure', `Restore failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    throw err;
  }
}

/**
 * Get backup statistics
 */
export function getBackupStats(): {
  lastBackup: Date | null;
  totalSize: number;
  itemCounts: Record<string, number>;
} {
  const lastBackupStr = localStorage.getItem('legacyScheduler_lastBackup');
  const lastBackup = lastBackupStr ? new Date(lastBackupStr) : null;

  let totalSize = 0;
  const itemCounts: Record<string, number> = {};

  // Calculate size and counts
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('legacyScheduler_')) {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += value.length;
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            itemCounts[key.replace('legacyScheduler_', '')] = parsed.length;
          }
        } catch {
          // Not JSON, skip
        }
      }
    }
  }

  return { lastBackup, totalSize, itemCounts };
}

/**
 * Update last backup timestamp
 */
export function updateLastBackupTimestamp(): void {
  localStorage.setItem('legacyScheduler_lastBackup', new Date().toISOString());
}

/**
 * Helper function to safely get localStorage items
 */
function getLocalStorageItem(key: string): any {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}


