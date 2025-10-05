import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageList } from '@/components/dashboard/message-list';
import { RecipientList } from '@/components/dashboard/recipient-list';
import { ScheduledMessageList } from '@/components/dashboard/scheduled-messages';
import { CalendarView } from '@/components/dashboard/calendar-view';
import { DmsConfiguration } from '@/components/dashboard/dms-configuration';
import { CreateMessageDialog } from '@/components/dashboard/create-message-dialog';
import { MigrationDialog } from '@/components/dashboard/migration-dialog';
import { StorageStatus } from '@/components/dashboard/storage-status';
import { EmailSetupGuide } from '@/components/ui/email-setup-guide';
import { VideoGallery } from '@/components/dashboard/video-gallery';
import { AudioGallery } from '@/components/dashboard/audio-gallery';
import { DashboardRecording } from '@/components/dashboard/dashboard-recording';
import { EmailService } from '@/lib/email-service';
import { Plus, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'react-router-dom';
import { useMessages } from '@/lib/use-messages';
import { supabase } from '@/lib/supabase';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('messages');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const { user } = useAuth();
  const { messages, refreshMessages } = useMessages();
  const { isValid: emailConfigured } = EmailService.validateEmailConfiguration();
  
  // Count scheduled messages
  const scheduledCount = messages.filter(m => m.status === 'SCHEDULED').length;
  
  // Count active Guardian Angel (DMS) messages
  const dmsCount = messages.filter(m => m.scope === 'DMS' && m.status !== 'SENT').length;
  
  // Auto-check for overdue DMS messages every 30 seconds (runs on dashboard)
  useEffect(() => {
    const checkOverdueMessages = async () => {
      if (!user || !supabase) return;
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      try {
        console.log('🔄 Auto-checking for overdue Guardian Angel messages...');
        const response = await fetch(
          `${supabaseUrl}/functions/v1/process-scheduled-messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Origin': window.location.origin
            },
            body: JSON.stringify({ emergency_release: false })
          }
        );
        
        if (response.ok) {
          console.log('✅ Auto-check completed, refreshing messages...');
          // Refresh messages after check
          await refreshMessages();
        } else {
          const errorText = await response.text();
          console.log('⚠️ Auto-check response:', response.status, errorText);
        }
      } catch (error) {
        console.log('Background DMS check completed', error);
      }
    };
    
    // Check immediately on load
    checkOverdueMessages();
    
    // Then check every 30 seconds
    const interval = setInterval(checkOverdueMessages, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                <StorageStatus />
              </div>
              <p className="text-muted-foreground mt-2">
                Manage your legacy messages and recipients
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setShowMigrationDialog(true)}
                className="text-sm"
              >
                Migrate Data
              </Button>
              <Link to="/dashboard/profile">
                <Button variant="outline">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Message
              </Button>
            </div>
          </div>
        </div>

        {/* Email Setup Guide */}
        {!emailConfigured && (
          <EmailSetupGuide />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="recipients">Recipients</TabsTrigger>
            <TabsTrigger value="scheduled" className="relative">
              Scheduled
              {scheduledCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {scheduledCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="recording">Recording</TabsTrigger>
            <TabsTrigger value="dms" className="relative">
              Guardian Angel
              {dmsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {dmsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages">
            <MessageList onCreateMessage={() => setShowCreateDialog(true)} />
          </TabsContent>

          <TabsContent value="recipients">
            <RecipientList />
          </TabsContent>

          <TabsContent value="scheduled">
            <ScheduledMessageList />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarView />
          </TabsContent>

          <TabsContent value="recording">
            <DashboardRecording />
          </TabsContent>

          <TabsContent value="dms">
            <DmsConfiguration />
          </TabsContent>

        </Tabs>

        {/* Video Gallery */}
        <div className="mt-8">
          <VideoGallery />
        </div>

        {/* Audio Gallery */}
        <div className="mt-8">
          <AudioGallery />
        </div>

        <CreateMessageDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />

        <MigrationDialog
          open={showMigrationDialog}
          onOpenChange={setShowMigrationDialog}
        />

      </div>
    </div>
  );
}