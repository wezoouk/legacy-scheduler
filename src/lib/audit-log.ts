/**
 * Audit Log System
 * Tracks security-related events and user actions
 */

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  user_id: string;
  user_email: string;
  action: AuditAction;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failure';
}

export type AuditAction = 
  | 'login'
  | 'logout'
  | 'password_change'
  | 'profile_update'
  | 'admin_access'
  | 'settings_change'
  | 'message_created'
  | 'message_deleted'
  | 'recipient_added'
  | 'recipient_deleted'
  | 'system_backup'
  | 'failed_login';

const AUDIT_LOG_STORAGE_KEY = 'legacyScheduler_auditLog';

/**
 * Get all audit log entries
 */
export function getAuditLogs(): AuditLogEntry[] {
  try {
    const logs = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (!logs) return [];
    
    const parsed = JSON.parse(logs);
    // Convert timestamp strings back to Date objects
    return parsed.map((log: any) => ({
      ...log,
      timestamp: new Date(log.timestamp),
    }));
  } catch (err) {
    console.error('Failed to load audit logs:', err);
    return [];
  }
}

/**
 * Add a new audit log entry
 */
export function addAuditLog(
  userId: string,
  userEmail: string,
  action: AuditAction,
  status: 'success' | 'failure' = 'success',
  details?: string
): void {
  try {
    const logs = getAuditLogs();
    
    const newEntry: AuditLogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      user_id: userId,
      user_email: userEmail,
      action,
      status,
      details,
      ip_address: 'Unknown', // Would need server-side to get real IP
      user_agent: navigator.userAgent,
    };
    
    // Keep only last 1000 entries
    const updatedLogs = [newEntry, ...logs].slice(0, 1000);
    
    localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(updatedLogs));
  } catch (err) {
    console.error('Failed to add audit log:', err);
  }
}

/**
 * Clear all audit logs (admin only)
 */
export function clearAuditLogs(): void {
  localStorage.removeItem(AUDIT_LOG_STORAGE_KEY);
}

/**
 * Export audit logs as JSON
 */
export function exportAuditLogs(): string {
  const logs = getAuditLogs();
  return JSON.stringify(logs, null, 2);
}

/**
 * Filter audit logs by criteria
 */
export function filterAuditLogs(
  logs: AuditLogEntry[],
  filters: {
    action?: AuditAction;
    userId?: string;
    status?: 'success' | 'failure';
    dateFrom?: Date;
    dateTo?: Date;
  }
): AuditLogEntry[] {
  return logs.filter(log => {
    if (filters.action && log.action !== filters.action) return false;
    if (filters.userId && log.user_id !== filters.userId) return false;
    if (filters.status && log.status !== filters.status) return false;
    if (filters.dateFrom && log.timestamp < filters.dateFrom) return false;
    if (filters.dateTo && log.timestamp > filters.dateTo) return false;
    return true;
  });
}


