import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MessageList } from '@/components/dashboard/message-list';
import { RecipientList } from '@/components/dashboard/recipient-list';
import { ScheduledMessageList } from '@/components/dashboard/scheduled-messages';
import { CalendarView } from '@/components/dashboard/calendar-view';
import { DmsConfiguration } from '@/components/dashboard/dms-configuration';
import { CreateMessageDialog } from '@/components/dashboard/create-message-dialog';
import { MigrationDialog } from '@/components/dashboard/migration-dialog';
import { StorageStatus } from '@/components/dashboard/storage-status';
import { DebugInfo } from '@/components/dashboard/debug-info';
import { DebugScheduledMessages } from '@/components/debug-scheduled-messages';
import { EmailSetupGuide } from '@/components/ui/email-setup-guide';
import { VideoGallery } from '@/components/dashboard/video-gallery';
import { AudioGallery } from '@/components/dashboard/audio-gallery';
import { DashboardRecording } from '@/components/dashboard/dashboard-recording';
import { EmailService } from '@/lib/email-service';
import { Plus, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('messages');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const { user } = useAuth();
  const { isValid: emailConfigured } = EmailService.validateEmailConfiguration();

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
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="recording">Recording</TabsTrigger>
            <TabsTrigger value="dms">Dead Man's Switch</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>

          <TabsContent value="messages">
            <MessageList />
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

          <TabsContent value="debug">
            <div className="space-y-6">
              <DebugScheduledMessages />
              <DebugInfo />
            </div>
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

        <DebugInfo />
      </div>
    </div>
  );
}