import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getAuditLogs,
  filterAuditLogs,
  exportAuditLogs,
  clearAuditLogs,
  type AuditLogEntry,
  type AuditAction,
} from '@/lib/audit-log';
import { 
  Download, 
  Trash2, 
  Filter,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface AuditLogViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogViewer({ open, onOpenChange }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');
  const [statusFilter, setStatusFilter] = useState<'success' | 'failure' | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open]);

  useEffect(() => {
    applyFilters();
  }, [logs, actionFilter, statusFilter, searchQuery]);

  const loadLogs = () => {
    const allLogs = getAuditLogs();
    setLogs(allLogs);
  };

  const applyFilters = () => {
    let filtered = logs;

    // Apply action filter
    if (actionFilter) {
      filtered = filterAuditLogs(filtered, { action: actionFilter });
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filterAuditLogs(filtered, { status: statusFilter });
    }

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(log => 
        log.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  const handleExport = () => {
    const json = exportAuditLogs();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all audit logs? This cannot be undone.')) {
      clearAuditLogs();
      loadLogs();
    }
  };

  const getActionBadge = (action: AuditAction) => {
    const colors: Record<string, string> = {
      login: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
      logout: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      password_change: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
      failed_login: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
      admin_access: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
      system_backup: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
    };

    return colors[action] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Audit Logs
          </DialogTitle>
          <DialogDescription>
            View system security events and user actions
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-3 gap-4 pb-4 border-b dark:border-gray-700">
          <div className="space-y-2">
            <Label htmlFor="search" className="text-xs">Search</Label>
            <Input
              id="search"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action-filter" className="text-xs">Action</Label>
            <select
              id="action-filter"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as AuditAction | '')}
              className="w-full h-8 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="password_change">Password Change</option>
              <option value="failed_login">Failed Login</option>
              <option value="admin_access">Admin Access</option>
              <option value="system_backup">System Backup</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status-filter" className="text-xs">Status</Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'success' | 'failure' | '')}
              className="w-full h-8 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No audit logs found</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={getActionBadge(log.action)}>
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(log.timestamp, 'PPp')}
                      </span>
                      {log.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {log.user_email}
                    </p>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
          <div className="text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} logs
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} className="text-red-600 dark:text-red-400">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



