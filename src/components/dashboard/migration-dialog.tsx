import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Database, Upload } from 'lucide-react';
import { MigrationService, type MigrationResult } from '@/lib/migration-service';

interface MigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MigrationDialog({ open, onOpenChange }: MigrationDialogProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open) {
      checkMigrationStatus();
    }
  }, [open]);

  const checkMigrationStatus = async () => {
    setIsChecking(true);
    try {
      const needed = await MigrationService.isMigrationNeeded();
      setMigrationNeeded(needed);
    } catch (error) {
      console.error('Error checking migration status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleMigration = async () => {
    setIsMigrating(true);
    setProgress(0);
    setMigrationResult(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await MigrationService.migrateAllData();
      
      clearInterval(progressInterval);
      setProgress(100);
      setMigrationResult(result);

      if (result.success) {
        // Clear localStorage data after successful migration
        MigrationService.clearLocalStorageData();
        // Update migration status
        setMigrationNeeded(false);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationResult({
        success: false,
        messagesMigrated: 0,
        recipientsMigrated: 0,
        errors: [`Migration failed: ${error}`]
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClose = () => {
    setMigrationResult(null);
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Migration
          </DialogTitle>
          <DialogDescription>
            Migrate your existing data from local storage to the cloud database
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isChecking && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Checking migration status...</p>
            </div>
          )}

          {!isChecking && !migrationNeeded && !migrationResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No migration needed. Your data is already in the cloud database.
              </AlertDescription>
            </Alert>
          )}

          {!isChecking && migrationNeeded && !migrationResult && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  We found existing data in your local storage that can be migrated to the cloud database.
                  This will make your data accessible across devices and provide better backup.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  onClick={handleMigration} 
                  disabled={isMigrating}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isMigrating ? 'Migrating...' : 'Start Migration'}
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isMigrating && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Migration Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Migrating your data to the cloud database...
              </p>
            </div>
          )}

          {migrationResult && (
            <div className="space-y-4">
              <Alert className={migrationResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {migrationResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={migrationResult.success ? 'text-green-800' : 'text-red-800'}>
                  {migrationResult.success ? (
                    <>
                      Migration completed successfully!<br />
                      Migrated {migrationResult.messagesMigrated} messages and {migrationResult.recipientsMigrated} recipients.
                    </>
                  ) : (
                    <>
                      Migration completed with errors.<br />
                      Migrated {migrationResult.messagesMigrated} messages and {migrationResult.recipientsMigrated} recipients.
                    </>
                  )}
                </AlertDescription>
              </Alert>

              {migrationResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Errors:</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {migrationResult.errors.map((error, index) => (
                      <p key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}



