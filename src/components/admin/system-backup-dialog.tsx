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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth-context';
import {
  createSystemBackup,
  downloadBackup,
  getBackupStats,
  updateLastBackupTimestamp,
} from '@/lib/system-backup';
import { 
  Download, 
  Database,
  CheckCircle,
  AlertCircle,
  Server,
  HardDrive
} from 'lucide-react';

interface SystemBackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SystemBackupDialog({ open, onOpenChange }: SystemBackupDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof getBackupStats> | null>(null);

  useEffect(() => {
    if (open) {
      loadStats();
    }
  }, [open]);

  const loadStats = () => {
    const backupStats = getBackupStats();
    setStats(backupStats);
  };

  const handleBackup = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setMessage(null);

      const backup = await createSystemBackup(user.id, user.email);
      updateLastBackupTimestamp();
      downloadBackup(backup);
      
      setMessage({
        type: 'success',
        text: 'Backup created and downloaded successfully!'
      });
      
      loadStats();
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create backup'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            System Backup
          </DialogTitle>
          <DialogDescription>
            Create a complete backup of your system data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {message && (
            <Alert className={
              message.type === 'success'
                ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800'
                : 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800'
            }>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <AlertDescription className={
                message.type === 'success'
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {/* Backup Stats */}
          {stats && (
            <div className="space-y-3 p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Last Backup
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.lastBackup ? format(stats.lastBackup, 'PPp') : 'Never'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                  <HardDrive className="w-4 h-4 mr-2" />
                  Total Size
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatBytes(stats.totalSize)}
                </span>
              </div>

              {Object.keys(stats.itemCounts).length > 0 && (
                <div className="pt-2 border-t dark:border-gray-600">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data Summary
                  </p>
                  <div className="space-y-1">
                    {Object.entries(stats.itemCounts).map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400 capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="text-gray-500 dark:text-gray-500 font-mono">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Backup Info */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p>The backup will include:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>User profile data</li>
              <li>All messages and recipients</li>
              <li>Site and admin settings</li>
              <li>Audit logs</li>
            </ul>
            <p className="text-xs pt-2">
              The backup file will be downloaded as a JSON file to your device.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBackup}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Server className="w-4 h-4 mr-2 animate-spin" />
                  Creating Backup...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Create Backup
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



