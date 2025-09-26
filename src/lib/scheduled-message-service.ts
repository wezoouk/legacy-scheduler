import { supabase, isSupabaseConfigured } from './supabase';
import { EmailService } from './email-service';

export interface ScheduledMessage {
  id: string;
  userId: string;
  title: string;
  content: string;
  types: string[];
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
  scheduledFor: string;
  recipientIds: string[];
  scope?: 'NORMAL' | 'DMS';
  cipherBlobUrl?: string;
  thumbnailUrl?: string;
  videoRecording?: string;
  audioRecording?: string;
  attachments?: Array<{ name: string; size: number; type: string }>;
  createdAt: string;
  updatedAt: string;
}

export class ScheduledMessageService {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  private static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 content
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Start the scheduled message checker
   */
  static start() {
    if (this.isRunning) {
      console.log('Scheduled message service is already running');
      return;
    }

    console.log('Starting scheduled message service...');
    this.isRunning = true;
    
    // Check every 1 minute for scheduled messages
    this.checkInterval = setInterval(() => {
      this.checkAndSendScheduledMessages();
    }, 60000); // 1 minute

    // Also check immediately
    this.checkAndSendScheduledMessages();
  }

  /**
   * Stop the scheduled message checker
   */
  static stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('Scheduled message service stopped');
  }

  /**
   * Check for and send scheduled messages that are due
   */
  private static async checkAndSendScheduledMessages() {
    try {
      const now = new Date().toISOString();
      console.log(`Checking for scheduled messages due before ${now}`);

      let scheduledMessages: any[] = [];

      // Try Supabase first
      if (isSupabaseConfigured && supabase) {
        console.log('Checking Supabase for scheduled messages...');
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('status', 'SCHEDULED')
          .lte('scheduledFor', now);

        // Debug: Log all SCHEDULED messages regardless of time
        const { data: allScheduled, error: allError } = await supabase
          .from('messages')
          .select('*')
          .eq('status', 'SCHEDULED');
        
        if (allScheduled && allScheduled.length > 0) {
          console.log('All SCHEDULED messages in database:', allScheduled.map(m => ({
            id: m.id,
            title: m.title,
            scheduledFor: m.scheduledFor,
            status: m.status,
            now: now
          })));
        }

        if (error) {
          console.error('Error fetching scheduled messages from Supabase:', error);
          console.log('Falling back to localStorage...');
          scheduledMessages = this.getScheduledMessagesFromLocalStorage(now);
        } else if (data) {
          scheduledMessages = data;
        } else {
          console.log('No scheduled messages in Supabase, checking localStorage...');
          scheduledMessages = this.getScheduledMessagesFromLocalStorage(now);
        }
      } else {
        console.log('Supabase not configured, checking localStorage...');
        // Fallback to localStorage
        scheduledMessages = this.getScheduledMessagesFromLocalStorage(now);
      }

      if (scheduledMessages.length === 0) {
        console.log('No scheduled messages due for sending');
        return;
      }

      console.log('Scheduled messages found:', scheduledMessages.map(m => ({
        id: m.id,
        title: m.title,
        scheduledFor: m.scheduledFor,
        status: m.status,
        recipientCount: m.recipientIds?.length || 0
      })));

      console.log(`Found ${scheduledMessages.length} scheduled messages due for sending`);

      // Process each scheduled message
      for (const message of scheduledMessages) {
        // Map snake_case columns back to camelCase for client compatibility (if from Supabase)
        const mappedMessage = message.user_id ? {
          ...message,
          userId: message.user_id,
          scheduledFor: message.scheduled_for ? new Date(message.scheduled_for) : null,
          recipientIds: message.recipient_ids,
          cipherBlobUrl: message.cipher_blob_url,
          thumbnailUrl: message.thumbnail_url,
          createdAt: new Date(message.created_at),
          updatedAt: new Date(message.updated_at),
        } : message; // Already in camelCase from localStorage

        await this.sendScheduledMessage(mappedMessage);
      }

      // Also check for DMS check-in reminders
      await this.checkDmsReminders();
    } catch (error) {
      console.error('Error in scheduled message check:', error);
    }
  }

  /**
   * Get scheduled messages from localStorage
   */
  private static getScheduledMessagesFromLocalStorage(now: string): any[] {
    try {
      const allScheduledMessages: any[] = [];
      const nowDate = new Date(now);

      // Get all users from localStorage
      const usersData = localStorage.getItem('legacyScheduler_users');
      if (!usersData) {
        console.log('No users found in localStorage');
        return [];
      }

      const users = JSON.parse(usersData);
      console.log(`Checking ${users.length} users for scheduled messages`);

      // Check each user's messages
      for (const user of users) {
        const messagesKey = `messages_${user.id}`;
        const userMessagesData = localStorage.getItem(messagesKey);
        
        if (userMessagesData) {
          const userMessages = JSON.parse(userMessagesData);
          console.log(`User ${user.email}: ${userMessages.length} total messages`);
          
          // Filter for scheduled messages that are due
          const scheduledMessages = userMessages.filter((message: any) => {
            const isScheduled = message.status === 'SCHEDULED';
            const hasScheduledFor = message.scheduledFor;
            const isDue = hasScheduledFor && new Date(message.scheduledFor) <= nowDate;
            
            if (isScheduled) {
              console.log(`  Scheduled message: ${message.title}, due: ${message.scheduledFor}, isDue: ${isDue}`);
            }
            
            return isScheduled && hasScheduledFor && isDue;
          });

          console.log(`User ${user.email}: ${scheduledMessages.length} scheduled messages due`);

          // Add user info to each message for admin context
          scheduledMessages.forEach((message: any) => {
            allScheduledMessages.push({
              ...message,
              userName: user.name || user.email,
              userEmail: user.email,
            });
          });
        } else {
          console.log(`User ${user.email}: no messages found`);
        }
      }

      console.log(`Total scheduled messages due: ${allScheduledMessages.length}`);
      return allScheduledMessages;
    } catch (error) {
      console.error('Error getting scheduled messages from localStorage:', error);
      return [];
    }
  }

  /**
   * Check for DMS check-in reminders
   */
  private static async checkDmsReminders() {
    try {
      // Load DMS config from localStorage
      const dmsConfig = localStorage.getItem('dms-config');
      const dmsCycle = localStorage.getItem('dms-cycle');

      if (!dmsConfig || !dmsCycle) {
        return;
      }

      const config = JSON.parse(dmsConfig);
      const cycle = JSON.parse(dmsCycle);

      if (config.status !== 'ACTIVE' || cycle.state === 'PAUSED') {
        return;
      }

      const now = new Date();
      const nextCheckin = new Date(cycle.nextCheckinAt);
      const reminderTime = new Date(nextCheckin.getTime() - (config.checkInReminderHours * 60 * 60 * 1000));

      // Check if it's time to send a reminder
      if (now >= reminderTime && !cycle.checkInReminderSent) {
        console.log('Sending DMS check-in reminder');
        
        // Send reminder email
        try {
          await EmailService.sendEmail({
            messageId: 'dms-reminder',
            recipientEmail: config.escalationContactId || 'user@example.com',
            recipientName: 'DMS User',
            subject: 'DMS Check-in Reminder',
            content: `This is a reminder that your DMS check-in is due in ${config.checkInReminderHours} hours. Please check in to prevent message release.`,
            messageType: 'EMAIL',
            attachments: []
          });

          // Update cycle to mark reminder as sent
          const updatedCycle = {
            ...cycle,
            checkInReminderSent: true,
            lastReminderSent: now.toISOString()
          };
          localStorage.setItem('dms-cycle', JSON.stringify(updatedCycle));
        } catch (error) {
          console.error('Error sending DMS reminder:', error);
        }
      }
    } catch (error) {
      console.error('Error checking DMS reminders:', error);
    }
  }

  /**
   * Send a scheduled message
   */
  private static async sendScheduledMessage(message: ScheduledMessage) {
    try {
      console.log(`Sending scheduled message: ${message.title}`);

      let emailSentSuccessfully = false;

      // Always send email notifications for scheduled messages (channel is email, types describe content)
        try {
          // Get recipient details
          let recipients: any[] = [];
          
          if (isSupabaseConfigured && supabase) {
            const { data, error: recipientsError } = await supabase
              .from('recipients')
              .select('*')
              .in('id', message.recipientIds);

            if (recipientsError) {
              console.error('Error fetching recipients:', recipientsError);
              return;
            }
            recipients = data || [];
          } else {
            // Get recipients from localStorage
            recipients = this.getRecipientsFromLocalStorage(message.recipientIds);
          }

          // Send email to each recipient
          let successCount = 0;
          let errorCount = 0;
          for (const recipient of recipients || []) {
            try {
              // Prepare attachments for email
              const attachments = [];
              
              // Video URLs are included in the content as links; no attachment needed
              if (message.cipherBlobUrl || message.videoRecording) {
                const videoUrl = message.cipherBlobUrl || message.videoRecording;
                console.log('Video message with URL:', videoUrl);
              }
              
              // Add audio attachment if present
              if (message.audioRecording) {
                if (message.audioRecording.startsWith('http')) {
                  try {
                    const response = await fetch(message.audioRecording);
                    const blob = await response.blob();
                    const base64 = await this.blobToBase64(blob);
                    attachments.push({
                      filename: 'audio-message.mp3',
                      content: base64,
                      contentType: 'audio/mpeg'
                    });
                  } catch (error) {
                    console.warn('Failed to fetch audio attachment:', error);
                    attachments.push({
                      filename: 'audio-message.mp3',
                      content: `Audio recording available at: ${message.audioRecording}`,
                      contentType: 'text/plain'
                    });
                  }
                } else {
                  // It's already base64 data URL
                  attachments.push({
                    filename: 'audio-message.mp3',
                    content: message.audioRecording.split(',')[1],
                    contentType: 'audio/mpeg'
                  });
                }
              }
              
              // Add file attachments if present
              if (message.attachments) {
                let attachmentsArray = message.attachments;
                if (typeof attachmentsArray === 'string') {
                  try {
                    attachmentsArray = JSON.parse(attachmentsArray);
                  } catch (e) {
                    console.warn('Failed to parse attachments JSON:', e);
                    attachmentsArray = [];
                  }
                }
                if (Array.isArray(attachmentsArray) && attachmentsArray.length > 0) {
                  attachmentsArray.forEach((file: any) => {
                    attachments.push({
                      filename: file.name,
                      content: `File attachment: ${file.name} (${file.size} bytes)`,
                      contentType: 'text/plain'
                    });
                  });
                }
              }

              const result = await EmailService.sendEmail({
                messageId: message.id,
                recipientEmail: recipient.email,
                recipientName: recipient.name,
                subject: message.title,
                content: message.content,
                messageType: message.types?.[0] || 'EMAIL',
                attachments: attachments
              });

              if (result && result.success) {
                console.log(`✅ Email sent to ${recipient.email}`);
                successCount++;
                emailSentSuccessfully = true;
              } else {
                errorCount++;
                console.error(`❌ Failed to send email to ${recipient.email}:`, result?.error || 'Unknown error');
              }
            } catch (emailError) {
              errorCount++;
              console.error(`Error sending email to ${recipient.email}:`, emailError);
            }
          }
        } catch (emailError) {
          console.error('Error sending scheduled email:', emailError);
        }

      // Only update status to SENT if email was sent successfully
      if (emailSentSuccessfully) {
        if (isSupabaseConfigured && supabase) {
          // Check if message exists in Supabase first
          const { data: existingMessage } = await supabase
            .from('messages')
            .select('id')
            .eq('id', message.id)
            .single();

          if (existingMessage) {
            const { error: updateError } = await supabase
              .from('messages')
              .update({ 
                status: 'SENT',
                updatedAt: new Date().toISOString()
              })
              .eq('id', message.id);

            if (updateError) {
              console.error('Error updating message status in Supabase:', updateError);
              // Fall back to localStorage
              this.updateMessageStatusInLocalStorage(message.id, 'SENT');
            } else {
              console.log('Message status updated in Supabase');
              // Dispatch custom event to notify UI of status change
              window.dispatchEvent(new CustomEvent('messageStatusUpdated', {
                detail: { messageId: message.id, status: 'SENT' }
              }));
            }
          } else {
            console.log('Message not found in Supabase, updating in localStorage');
            this.updateMessageStatusInLocalStorage(message.id, 'SENT');
          }
        } else {
          // Update in localStorage
          this.updateMessageStatusInLocalStorage(message.id, 'SENT');
        }
      } else {
        // Update status to FAILED if email sending failed
        if (isSupabaseConfigured && supabase) {
          const { error: updateError } = await supabase
            .from('messages')
            .update({ 
              status: 'FAILED',
              updatedAt: new Date().toISOString()
            })
            .eq('id', message.id);

          if (updateError) {
            console.error('Error updating message status to FAILED:', updateError);
          } else {
            console.log('Message status updated to FAILED in Supabase');
            // Dispatch custom event to notify UI of status change
            window.dispatchEvent(new CustomEvent('messageStatusUpdated', {
              detail: { messageId: message.id, status: 'FAILED' }
            }));
          }
        }
      }

      console.log(`Successfully sent scheduled message: ${message.title}`);
    } catch (error) {
      console.error(`Error sending scheduled message ${message.title}:`, error);
      
      // Update message status to FAILED
      try {
        if (isSupabaseConfigured && supabase) {
          supabase
            .from('messages')
            .update({ 
              status: 'FAILED',
              updatedAt: new Date().toISOString()
            })
            .eq('id', message.id)
            .then(({ error: updateError }) => {
              if (!updateError) {
                // Dispatch custom event to notify UI of status change
                window.dispatchEvent(new CustomEvent('messageStatusUpdated', {
                  detail: { messageId: message.id, status: 'FAILED' }
                }));
              } else {
                console.error('Error updating message status to FAILED:', updateError);
              }
            })
            .catch((e) => console.error('Error updating message status to FAILED:', e));
        } else {
          this.updateMessageStatusInLocalStorage(message.id, 'FAILED');
        }
      } catch (updateError) {
        console.error('Error updating message status to FAILED:', updateError);
      }
    }
  }

  /**
   * Update message status in localStorage
   */
  private static updateMessageStatusInLocalStorage(messageId: string, status: 'SENT' | 'FAILED') {
    try {
      const usersData = localStorage.getItem('legacyScheduler_users');
      if (!usersData) return;

      const users = JSON.parse(usersData);

      for (const user of users) {
        const messagesKey = `messages_${user.id}`;
        const userMessagesData = localStorage.getItem(messagesKey);
        
        if (userMessagesData) {
          const userMessages = JSON.parse(userMessagesData);
          const messageIndex = userMessages.findIndex((m: any) => m.id === messageId);
          
          if (messageIndex !== -1) {
            userMessages[messageIndex].status = status;
            userMessages[messageIndex].updatedAt = new Date().toISOString();
            localStorage.setItem(messagesKey, JSON.stringify(userMessages));
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error updating message status in localStorage:', error);
    }
  }

  /**
   * Get recipients from localStorage
   */
  private static getRecipientsFromLocalStorage(recipientIds: string[]): any[] {
    try {
      const allRecipients: any[] = [];
      const usersData = localStorage.getItem('legacyScheduler_users');
      if (!usersData) return [];

      const users = JSON.parse(usersData);

      for (const user of users) {
        const recipientsKey = `recipients_${user.id}`;
        const userRecipientsData = localStorage.getItem(recipientsKey);
        
        if (userRecipientsData) {
          const userRecipients = JSON.parse(userRecipientsData);
          const matchingRecipients = userRecipients.filter((r: any) => 
            recipientIds.includes(r.id)
          );
          allRecipients.push(...matchingRecipients);
        }
      }

      return allRecipients;
    } catch (error) {
      console.error('Error getting recipients from localStorage:', error);
      return [];
    }
  }

  /**
   * Get the current status of the service
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: this.checkInterval !== null
    };
  }

  /**
   * Manually trigger a check for scheduled messages (for testing)
   */
  static async triggerCheck() {
    console.log('🔍 Manually triggering scheduled message check...');
    await this.checkAndSendScheduledMessages();
  }
}

// Auto-start the service when the module is loaded
if (typeof window !== 'undefined') {
  // Only start in browser environment
  ScheduledMessageService.start();
  
  // Make it available globally for debugging
  (window as any).ScheduledMessageService = ScheduledMessageService;
}
