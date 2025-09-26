import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { useRecipients } from '@/lib/use-recipients';
import { useMessages } from '@/lib/use-messages';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ScheduledMessageService } from '@/lib/scheduled-message-service';
import { EmailService } from '@/lib/email-service';
import { toast } from '../../../hooks/use-toast';
import { Database, HardDrive, Users, Mail, RefreshCw, Clock, Send, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function DebugInfo() {
  const { user } = useAuth();
  const { recipients, isLoading: recipientsLoading } = useRecipients();
  const { messages, isLoading: messagesLoading } = useMessages();
  const [localStorageData, setLocalStorageData] = useState<any>({});
  
  // Email testing state
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('Test Email from Legacy Scheduler');
  const [testContent, setTestContent] = useState('This is a test email to verify that the email system is working correctly.');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [configStatus, setConfigStatus] = useState<any>(null);

  const refreshLocalStorageData = () => {
    const data: any = {};
    if (user) {
      data.recipients = localStorage.getItem(`recipients_${user.id}`);
      data.messages = localStorage.getItem(`messages_${user.id}`);
      data.users = localStorage.getItem('legacyScheduler_users');
    }
    setLocalStorageData(data);
  };

  // Check email configuration status
  const checkConfiguration = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;

    const status = {
      supabase: {
        configured: !!(supabaseUrl && supabaseKey),
        url: supabaseUrl ? 'Configured' : 'Missing',
        key: supabaseKey ? 'Configured' : 'Missing'
      },
      resend: {
        configured: !!resendApiKey,
        key: resendApiKey ? 'Configured' : 'Missing'
      }
    };

    setConfigStatus(status);
    return status;
  };

  // Send test email
  const handleSendTest = async () => {
    if (!testEmail) {
      toast({
        title: 'Error',
        description: 'Please enter a test email address',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    setTestResult(null);

    try {
      const request = {
        messageId: `test-${Date.now()}`,
        recipientEmail: testEmail,
        recipientName: 'Test Recipient',
        subject: testSubject,
        content: testContent,
        messageType: 'EMAIL' as const,
      };

      console.log('Sending test email:', request);
      const result = await EmailService.sendEmail(request);
      
      setTestResult(result);
      
      if (result.success) {
        toast({
          title: 'Test Email Sent',
          description: `Email successfully sent to ${testEmail}`,
        });
      } else {
        toast({
          title: 'Test Email Failed',
          description: result.error || 'Unknown error occurred',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Test email error:', error);
      setTestResult({
        success: false,
        error: error.message || 'Unknown error occurred'
      });
      
      toast({
        title: 'Test Email Error',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    refreshLocalStorageData();
  }, [user, recipients, messages]);

  if (!user) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Debug Information</CardTitle>
          <Button variant="outline" size="sm" onClick={refreshLocalStorageData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Storage Mode</h4>
            <Badge variant={isSupabaseConfigured ? 'default' : 'secondary'}>
              {isSupabaseConfigured ? (
                <>
                  <Database className="h-3 w-3 mr-1" />
                  Supabase
                </>
              ) : (
                <>
                  <HardDrive className="h-3 w-3 mr-1" />
                  LocalStorage
                </>
              )}
            </Badge>
          </div>
          <div>
            <h4 className="font-medium mb-2">User Info</h4>
            <div className="text-sm text-muted-foreground">
              <div>ID: {user.id}</div>
              <div>Plan: {user.plan}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Scheduled Messages
            </h4>
            <div className="text-sm">
              <div>Service: {ScheduledMessageService.getStatus().isRunning ? 'Running' : 'Stopped'}</div>
              <div>Scheduled: {messages.filter(m => m.status === 'SCHEDULED').length}</div>
              <div>Sent: {messages.filter(m => m.status === 'SENT').length}</div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">System Status</h4>
            <div className="text-sm">
              <div>Supabase: {isSupabaseConfigured ? 'Connected' : 'Not Configured'}</div>
              <div>Resend API: {import.meta.env.VITE_RESEND_API_KEY ? 'Configured' : 'Not Configured'}</div>
              <div>Messages: {messages.length} total</div>
              <div>Recipients: {recipients.length} total</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Recipients
            </h4>
            <div className="text-sm">
              <div>Loaded: {recipients.length}</div>
              <div>Loading: {recipientsLoading ? 'Yes' : 'No'}</div>
              <div>LocalStorage: {localStorageData.recipients ? 'Yes' : 'No'}</div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              Messages
            </h4>
            <div className="text-sm">
              <div>Loaded: {messages.length}</div>
              <div>Loading: {messagesLoading ? 'Yes' : 'No'}</div>
              <div>LocalStorage: {localStorageData.messages ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>

        {/* Email Testing Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Testing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Configuration Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Supabase URL:</span>
                <Badge variant={configStatus?.supabase?.configured ? 'default' : 'destructive'}>
                  {configStatus?.supabase?.url || 'Check Configuration'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Supabase Key:</span>
                <Badge variant={configStatus?.supabase?.configured ? 'default' : 'destructive'}>
                  {configStatus?.supabase?.key || 'Check Configuration'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Resend API Key:</span>
                <Badge variant={configStatus?.resend?.configured ? 'default' : 'destructive'}>
                  {configStatus?.resend?.key || 'Check Configuration'}
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkConfiguration}
                className="w-full"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Check Configuration
              </Button>
            </div>

            {/* Test Email Form */}
            <div className="space-y-3 pt-3 border-t">
              <div className="space-y-2">
                <Label htmlFor="testEmail" className="text-sm font-medium">Test Email Address</Label>
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testSubject" className="text-sm font-medium">Subject</Label>
                <Input
                  id="testSubject"
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testContent" className="text-sm font-medium">Content</Label>
                <Textarea
                  id="testContent"
                  rows={3}
                  value={testContent}
                  onChange={(e) => setTestContent(e.target.value)}
                  placeholder="Enter your test email content..."
                  className="text-sm"
                />
              </div>

              <Button 
                onClick={handleSendTest} 
                disabled={isSending || !testEmail}
                className="w-full flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Test Email
                  </>
                )}
              </Button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className="pt-3 border-t">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Test Result:</span>
                    <Badge variant={testResult.success ? 'default' : 'destructive'} className="flex items-center gap-1">
                      {testResult.success ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {testResult.success ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                  
                  {testResult.success ? (
                    <div className="text-sm space-y-1">
                      <p className="text-green-600">✅ Email sent successfully!</p>
                      {testResult.messageId && (
                        <p className="text-xs text-muted-foreground">
                          Message ID: {testResult.messageId}
                        </p>
                      )}
                      {testResult.deliveredAt && (
                        <p className="text-xs text-muted-foreground">
                          Delivered at: {new Date(testResult.deliveredAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm space-y-1">
                      <p className="text-red-600">❌ Email failed to send</p>
                      {testResult.error && (
                        <p className="text-xs text-muted-foreground">
                          Error: {testResult.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {recipients.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Recipients List</h4>
            <div className="text-sm space-y-1">
              {recipients.map((recipient) => (
                <div key={recipient.id} className="flex justify-between">
                  <span>{recipient.name}</span>
                  <span className="text-muted-foreground">{recipient.email}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
