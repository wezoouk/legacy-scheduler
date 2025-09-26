import { Alert, AlertDescription } from './alert';
import { Info } from 'lucide-react';

interface DebugBannerProps {
  type: 'demo-mode' | 'email-config';
  onDismiss?: () => void;
}

export const DebugBanner = ({ type, onDismiss }: DebugBannerProps) => {
  const getMessage = () => {
    switch (type) {
      case 'demo-mode':
        return 'Demo mode: Using local data. Sign in with a valid account to access the database.';
      case 'email-config':
        return 'Email service not configured. Please set RESEND_API_KEY in Supabase edge functions.';
      default:
        return 'Debug mode active';
    }
  };

  return (
    <Alert className="mb-4">
      <Info className="h-4 w-4" />
      <AlertDescription>
        {getMessage()}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 underline hover:opacity-80"
          >
            Dismiss
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
};


