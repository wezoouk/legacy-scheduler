import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, HardDrive, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isSupabaseConfigured } from '@/lib/supabase';

export function StorageNotification() {
  const [isVisible, setIsVisible] = useState(false);
  const [storageMode, setStorageMode] = useState<'supabase' | 'local'>('local');
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the notification
    const dismissed = localStorage.getItem('storage-notification-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    // Check storage mode and show notification
    const checkStorageMode = () => {
      if (isSupabaseConfigured) {
        setStorageMode('supabase');
        setIsVisible(true);
      } else {
        setStorageMode('local');
        setIsVisible(true);
      }
    };

    checkStorageMode();
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('storage-notification-dismissed', 'true');
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <Alert className={`max-w-md mx-auto shadow-lg ${
        storageMode === 'supabase' 
          ? 'border-green-200 bg-green-50 text-green-800' 
          : 'border-yellow-200 bg-yellow-50 text-yellow-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {storageMode === 'supabase' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription className="font-medium">
              {storageMode === 'supabase' 
                ? 'Saving to Supabase Database' 
                : 'Saving to Local Storage'
              }
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 hover:bg-transparent"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="mt-1 text-xs opacity-75">
          {storageMode === 'supabase' 
            ? 'Your data is being saved to the cloud database and will sync across devices.'
            : 'Your data is being saved locally. Configure Supabase for cloud storage.'
          }
        </div>
      </Alert>
    </div>
  );
}
