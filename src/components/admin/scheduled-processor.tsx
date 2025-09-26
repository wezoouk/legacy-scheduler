import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle, Clock, Mail } from 'lucide-react';

interface ProcessResult {
  success: boolean;
  processed?: number;
  errors?: number;
  total?: number;
  timestamp?: string;
  error?: string;
}

export function ScheduledProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ProcessResult | null>(null);

  const triggerProcessing = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-scheduled-messages', {
        body: {}
      });

      if (error) {
        setLastResult({ success: false, error: error.message });
      } else {
        setLastResult(data);
      }
    } catch (err) {
      setLastResult({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Scheduled Message Processor
        </CardTitle>
        <CardDescription>
          Server-side processing of scheduled messages. In production, this should run automatically via cron job.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={triggerProcessing} 
          disabled={isProcessing}
          className="w-full"
        >
          <Mail className="h-4 w-4 mr-2" />
          {isProcessing ? 'Processing...' : 'Process Scheduled Messages'}
        </Button>

        {lastResult && (
          <div className={`p-4 rounded-lg border ${
            lastResult.success 
              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
              : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-semibold">
                {lastResult.success ? 'Success' : 'Error'}
              </span>
            </div>
            
            {lastResult.success ? (
              <div className="text-sm space-y-1">
                <p>Messages processed: {lastResult.processed}/{lastResult.total}</p>
                {lastResult.errors && lastResult.errors > 0 && (
                  <p className="text-orange-600">Errors: {lastResult.errors}</p>
                )}
                <p className="text-gray-600">
                  Processed at: {lastResult.timestamp && new Date(lastResult.timestamp).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-sm text-red-600">{lastResult.error}</p>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>For Production:</strong></p>
          <p>• Set up a cron job to call this Edge Function every minute</p>
          <p>• Use GitHub Actions, Vercel Cron, or external service</p>
          <p>• Example: <code>curl -X POST {'{supabase-url}'}/functions/v1/process-scheduled-messages</code></p>
        </div>
      </CardContent>
    </Card>
  );
}
