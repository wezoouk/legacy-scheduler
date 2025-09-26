import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Database, HardDrive, CheckCircle, AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

export function StorageStatus() {
  const [storageMode, setStorageMode] = useState<'supabase' | 'local'>('local');

  useEffect(() => {
    const checkStorageMode = () => {
      if (isSupabaseConfigured) {
        setStorageMode('supabase');
      } else {
        setStorageMode('local');
      }
    };

    checkStorageMode();
  }, []);

  return (
    <Badge 
      variant={storageMode === 'supabase' ? 'default' : 'secondary'}
      className="flex items-center gap-1"
    >
      {storageMode === 'supabase' ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {storageMode === 'supabase' ? 'Cloud Storage' : 'Local Storage'}
    </Badge>
  );
}


