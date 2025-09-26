import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScheduledMessageService } from '@/lib/scheduled-message-service';

export function DebugScheduledMessages() {
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [lastCheck, setLastCheck] = useState<string>('');

  const loadScheduledMessages = () => {
    try {
      const allScheduledMessages: any[] = [];
      const now = new Date().toISOString();
      const nowDate = new Date(now);

      // Get all users from localStorage
      const usersData = localStorage.getItem('legacyScheduler_users');
      if (!usersData) return;

      const users = JSON.parse(usersData);

      // Check each user's messages
      for (const user of users) {
        const messagesKey = `messages_${user.id}`;
        const userMessagesData = localStorage.getItem(messagesKey);
        
        if (userMessagesData) {
          const userMessages = JSON.parse(userMessagesData);
          
          // Filter for scheduled messages
          const scheduledMessages = userMessages.filter((message: any) => {
            return message.status === 'SCHEDULED';
          });

          // Add user info to each message
          scheduledMessages.forEach((message: any) => {
            allScheduledMessages.push({
              ...message,
              userName: user.name || user.email,
              userEmail: user.email,
              isDue: message.scheduledFor && new Date(message.scheduledFor) <= nowDate
            });
          });
        }
      }

      setScheduledMessages(allScheduledMessages);
    } catch (error) {
      console.error('Error loading scheduled messages:', error);
    }
  };

  const triggerCheck = async () => {
    setLastCheck(new Date().toLocaleTimeString());
    await ScheduledMessageService.triggerCheck();
    loadScheduledMessages(); // Reload after check
  };

  useEffect(() => {
    loadScheduledMessages();
    setServiceStatus(ScheduledMessageService.getStatus());
  }, []);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Scheduled Messages Debug</CardTitle>
        <div className="flex gap-2">
          <Button onClick={loadScheduledMessages} variant="outline">
            Refresh
          </Button>
          <Button onClick={triggerCheck} variant="default">
            Trigger Check Now
          </Button>
        </div>
        {lastCheck && (
          <p className="text-sm text-muted-foreground">
            Last check triggered: {lastCheck}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Service Status</h3>
            <div className="flex gap-2">
              <Badge variant={serviceStatus?.isRunning ? "default" : "secondary"}>
                {serviceStatus?.isRunning ? "Running" : "Stopped"}
              </Badge>
              <Badge variant={serviceStatus?.hasInterval ? "default" : "secondary"}>
                {serviceStatus?.hasInterval ? "Has Interval" : "No Interval"}
              </Badge>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">
              Scheduled Messages ({scheduledMessages.length})
            </h3>
            {scheduledMessages.length === 0 ? (
              <p className="text-muted-foreground">No scheduled messages found</p>
            ) : (
              <div className="space-y-2">
                {scheduledMessages.map((message) => (
                  <div key={message.id} className="border rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{message.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          From: {message.userName} ({message.userEmail})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Scheduled for: {new Date(message.scheduledFor).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Recipients: {message.recipientIds?.length || 0}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={message.isDue ? "destructive" : "secondary"}>
                          {message.isDue ? "Due Now" : "Future"}
                        </Badge>
                        <Badge variant="outline">{message.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



