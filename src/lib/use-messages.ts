import { useState, useEffect } from 'react';
import { useAuthUserId } from './useAuthUserId';
import { EmailService, type SendEmailRequest } from './email-service';
import { useRecipients } from './use-recipients';
import { Mail, Video, Mic, FileText } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabase';
import { onceWarn } from './onceWarn';
 

export interface Message {
  id: string;
  userId: string;
  title: string;
  content: string;
  types: ('EMAIL' | 'VIDEO' | 'VOICE' | 'FILE')[];
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
  scheduledFor?: Date;
  recipientIds: string[];
  scope?: 'NORMAL' | 'DMS';
  cipherBlobUrl?: string;
  thumbnailUrl?: string;
  // Guardian Angel status
  dmsOverdue?: boolean;
  dmsNextCheckin?: Date;
  // Legacy fields for localStorage compatibility
  videoRecording?: string;
  audioRecording?: string;
  attachments?: Array<{ name: string; size: number; type: string }>;
  // Admin view fields
  userName?: string;
  userEmail?: string;
  // Legacy fields
  type?: string;
  recipients?: any[];
  sentAt?: string;
  // Message history
  deleted?: boolean;
  deletedAt?: Date;
  // Email tracking
  deliveryStatus?: {
    [recipientId: string]: {
      status: 'PENDING' | 'DELIVERED' | 'BOUNCED' | 'OPENED' | 'FAILED';
      deliveredAt?: Date;
      bouncedAt?: Date;
      openedAt?: Date;
      errorMessage?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to get the appropriate icon for a message type
export function getMessageIcon(messageType: string) {
  switch (messageType) {
    case 'EMAIL':
      return Mail;
    case 'VIDEO':
      return Video;
    case 'VOICE':
      return Mic;
    case 'FILE':
      return FileText;
    default:
      return Mail;
  }
}

// Helper function to get recipient names from IDs
export function getRecipientNames(recipientIds: string[], recipients: any[] = []): string {
  if (recipientIds.length === 0) return 'No recipients';
  
  const names = recipientIds
    .map(id => recipients.find(r => r.id === id)?.name)
    .filter(Boolean);
  
  if (names.length === 0) return `${recipientIds.length} recipient${recipientIds.length > 1 ? 's' : ''}`;
  
  if (names.length === 1) return names[0];
  if (names.length === 2) return names.join(' and ');
  
  return `${names[0]} and ${names.length - 1} other${names.length > 2 ? 's' : ''}`;
}

// Helper function to generate UUIDs compatible with Supabase UUID columns
function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as any).randomUUID();
  }
  const hex = [...Array(36)].map((_, i) =>
    [8, 13, 18, 23].includes(i) ? '-' : Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDemoBanner, setShowDemoBanner] = useState(false);
  const authUser = useAuthUserId();
  const { recipients } = useRecipients();

  useEffect(() => {
    if (!authUser.id || !authUser.isAuthenticated) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    fetchMessages();
  }, [authUser.id, authUser.isAuthenticated]);

  // Auto-refresh messages every 10 seconds to catch status updates from scheduled service (which checks every 5 minutes)
  useEffect(() => {
    if (!authUser.id || !authUser.isAuthenticated) return;

    const interval = setInterval(() => {
      // Only refresh if we have scheduled messages that might change status
      const hasScheduledMessages = messages.some(msg => msg.status === 'SCHEDULED');
      if (hasScheduledMessages) {
        if (localStorage.getItem('debug_verbose') === '1') {
          console.log('Auto-refreshing messages to check for status updates...');
        }
        fetchMessages();
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [authUser.id, messages]);

  // Listen for immediate status updates from scheduled message service
  useEffect(() => {
    const handleStatusUpdate = (event: CustomEvent) => {
      if (localStorage.getItem('debug_verbose') === '1') {
        console.log('Received message status update event:', event.detail);
      }
      // Refresh messages immediately when status changes
      fetchMessages();
    };

    window.addEventListener('messageStatusUpdated', handleStatusUpdate as EventListener);
    
    return () => {
      window.removeEventListener('messageStatusUpdated', handleStatusUpdate as EventListener);
    };
  }, [authUser.id]);

  const fetchMessages = async () => {
    if (!authUser.id || !authUser.isAuthenticated) return;

    try {
      // FORCE Supabase only - NO localStorage fallback
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase not configured - localStorage fallback disabled');
      }
      
      // Check if user is authenticated with Supabase (has a valid session)
      const { data: { session } } = await supabase.auth.getSession();
      const isSupabaseUser = session?.user;
      
      if (!isSupabaseUser) {
        throw new Error('User not authenticated with Supabase - localStorage fallback disabled');
      }

      if (localStorage.getItem('debug_verbose') === '1') {
        console.log('Fetching messages from Supabase database');
      }
      await loadFromDatabase();
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]); // Clear messages on error - NO FALLBACK
      throw error; // NO FALLBACK - Supabase only
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromDatabase = async () => {
    if (!authUser.id || !authUser.isAuthenticated || !supabase) return;

    try {
      let query = supabase
        .from('messages')
        .select('*')
        .order('createdAt', { ascending: false });

      // Admin users can see all messages, regular users only their own
      if (authUser.id !== 'admin-user-id') {
        query = query.eq('userId', authUser.id);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('No messages found (PGRST205)');
          setMessages([]);
          return;
        }
        console.error('Error fetching messages from database:', error);
        throw error;
      }

      const formattedMessages = (data || []).map((msg: any) => ({
        ...msg,
        types: Array.isArray(msg.types) ? msg.types : (msg.types ? [msg.types] : ['EMAIL']),
        createdAt: new Date(msg.createdAt),
        updatedAt: new Date(msg.updatedAt),
        scheduledFor: msg.scheduledFor ? new Date(msg.scheduledFor) : undefined,
        recipientIds: Array.isArray(msg.recipientIds) ? msg.recipientIds : [],
        attachments: msg.attachments ? JSON.parse(msg.attachments) : undefined,
      }));

      // Check DMS status for Guardian Angel protected messages
      const messagesWithDmsStatus = await Promise.all(
        formattedMessages.map(async (msg) => {
          if (msg.scope === 'DMS' && msg.status === 'DRAFT') {
            try {
              // Get active DMS config for this user
              const { data: configs } = await supabase
                .from('dms_configs')
                .select('*')
                .eq('userId', msg.userId)
                .eq('status', 'ACTIVE')
                .limit(1);

              if (configs && configs.length > 0) {
                const config = configs[0];
                
                // Get the latest cycle for this config
                const { data: cycles } = await supabase
                  .from('dms_cycles')
                  .select('*')
                  .eq('configId', config.id)
                  .order('nextCheckinAt', { ascending: false })
                  .limit(1);

                if (cycles && cycles.length > 0) {
                  const cycle = cycles[0];
                  const nextCheckin = new Date(cycle.nextCheckinAt);
                  
                  // Calculate grace deadline
                  let graceMs = 0;
                  switch (config.graceUnit) {
                    case 'minutes':
                      graceMs = config.graceDays * 60 * 1000;
                      break;
                    case 'hours':
                      graceMs = config.graceDays * 60 * 60 * 1000;
                      break;
                    case 'days':
                    default:
                      graceMs = config.graceDays * 24 * 60 * 60 * 1000;
                      break;
                  }
                  
                  const graceDeadline = new Date(nextCheckin.getTime() + graceMs);
                  const now = new Date();
                  
                  return {
                    ...msg,
                    dmsOverdue: now > graceDeadline,
                    dmsNextCheckin: nextCheckin,
                  };
                }
              }
            } catch (error) {
              console.error('Error checking DMS status:', error);
            }
          }
          return msg;
        })
      );

      if (localStorage.getItem('debug_verbose') === '1') {
        console.log(`Loaded ${messagesWithDmsStatus.length} messages from database`);
      }
      setMessages(messagesWithDmsStatus);
    } catch (error) {
      console.error('Error loading from database:', error);
      throw error;
    }
  };

  // REMOVED: loadFromLocalStorage - localStorage fallback disabled

  const saveToDatabase = async (message: Message) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('messages')
      .insert({
        id: message.id,
        userId: message.userId,
        scope: message.scope || 'NORMAL',
        types: message.types,
        title: message.title,
        content: message.content,
        status: message.status,
        scheduledFor: message.scheduledFor?.toISOString() || null,
        recipientIds: message.recipientIds,
        cipherBlobUrl: message.cipherBlobUrl || null,
        thumbnailUrl: message.thumbnailUrl || null,
        videoRecording: message.videoRecording || null,
        audioRecording: message.audioRecording || null,
        attachments: message.attachments ? JSON.stringify(message.attachments) : null,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
      });

    if (error) {
      console.error('Error saving message to database:', error);
      throw error;
    }

    console.log('Message saved to database successfully');
    
    // Don't refresh immediately - the optimistic update should be sufficient
    // The message will be refreshed on next page load or manual refresh
  };

  // REMOVED: saveToLocalStorage - localStorage fallback disabled

  const updateInDatabase = async (id: string, updatedMessage: Message) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('messages')
      .update({
        scope: updatedMessage.scope || 'NORMAL',
        types: updatedMessage.types,
        title: updatedMessage.title,
        content: updatedMessage.content,
        status: updatedMessage.status,
        scheduledFor: updatedMessage.scheduledFor ? 
          (typeof updatedMessage.scheduledFor === 'string' ? updatedMessage.scheduledFor : updatedMessage.scheduledFor.toISOString()) 
          : null,
        recipientIds: updatedMessage.recipientIds,
        cipherBlobUrl: updatedMessage.cipherBlobUrl || null,
        thumbnailUrl: updatedMessage.thumbnailUrl || null,
        videoRecording: updatedMessage.videoRecording || null,
        audioRecording: updatedMessage.audioRecording || null,
        attachments: updatedMessage.attachments ? JSON.stringify(updatedMessage.attachments) : null,
        updatedAt: updatedMessage.updatedAt ? 
          (typeof updatedMessage.updatedAt === 'string' ? updatedMessage.updatedAt : updatedMessage.updatedAt.toISOString())
          : new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating message in database:', error);
      throw error;
    }

    // Update local state immediately
    const updatedMessages = messages.map(msg => 
      msg.id === id ? updatedMessage : msg
    );
    setMessages(updatedMessages);
    console.log('Message updated in database successfully');
    
    // Don't refresh immediately - the optimistic update should be sufficient
    // The message will be refreshed on next page load or manual refresh
  };

  // REMOVED: updateInLocalStorage - localStorage fallback disabled

  const createMessage = async (messageData: Omit<Message, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    console.log('=== CORE createMessage CALLED ===');
    console.log('Message data received:', {
      title: messageData.title,
      types: messageData.types,
      cipherBlobUrl: messageData.cipherBlobUrl,
      thumbnailUrl: messageData.thumbnailUrl,
      content: messageData.content?.substring(0, 100) + '...'
    });
    
    if (!authUser.id) throw new Error('User not authenticated');

    const newMessage: Message = {
      ...messageData,
      id: generateId(),
      userId: authUser.id,
      types: messageData.types || ['EMAIL'],
      recipientIds: messageData.recipientIds || [],
      scope: messageData.scope || 'NORMAL',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log('Final message object:', {
      id: newMessage.id,
      title: newMessage.title,
      types: newMessage.types,
      cipherBlobUrl: newMessage.cipherBlobUrl,
      thumbnailUrl: newMessage.thumbnailUrl
    });

    // Update local state immediately for instant UI feedback
    const updatedMessages = [newMessage, ...messages];
    setMessages(updatedMessages);

    try {
      // FORCE Supabase only - NO localStorage fallback
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase not configured - localStorage fallback disabled');
      }
      
      // Check if user is authenticated with Supabase (has a valid session)
      const { data: { session } } = await supabase.auth.getSession();
      const isSupabaseUser = session?.user;
      
      if (!isSupabaseUser) {
        throw new Error('User not authenticated with Supabase - localStorage fallback disabled');
      }
      
      console.log('Saving message to Supabase database for user:', authUser.id);
      await saveToDatabase(newMessage);
    } catch (error) {
      console.error('Error saving message:', error);
      // Revert the optimistic update on error
      setMessages(messages);
      throw error; // NO FALLBACK - Supabase only
    }

    return newMessage;
  };

  const updateMessage = async (id: string, updates: Partial<Message>) => {
    if (!authUser.id) throw new Error('User not authenticated');

    const messageToUpdate = messages.find(m => m.id === id);
    if (!messageToUpdate) throw new Error('Message not found');

    // If message is being sent, trigger email delivery
    if (updates.status === 'SENT' && messageToUpdate.types?.includes('EMAIL')) {
      await sendMessageEmails({ ...messageToUpdate, ...updates });
    }

    const updatedMessage = {
      ...messageToUpdate,
      ...updates,
      updatedAt: new Date(),
    };

    try {
      // FORCE Supabase only - NO localStorage fallback
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase not configured - localStorage fallback disabled');
      }
      
      // Check if user is authenticated with Supabase (has a valid session)
      const { data: { session } } = await supabase.auth.getSession();
      const isSupabaseUser = session?.user;
      
      if (!isSupabaseUser) {
        throw new Error('User not authenticated with Supabase - localStorage fallback disabled');
      }
      
      console.log('Updating message in Supabase database');
      await updateInDatabase(id, updatedMessage);
    } catch (error) {
      console.error('Error updating message:', error);
      throw error; // NO FALLBACK - force user to fix Supabase configuration
    }
  };

  const sendMessageEmails = async (message: Message) => {
    console.log('📧 Sending emails for message:', message.id);
    
    try {
      // Get recipients for this message
      const messageRecipients = recipients.filter(r => 
        message.recipientIds?.includes(r.id)
      );
      
      if (messageRecipients.length === 0) {
        console.warn('⚠️ No recipients found for message:', message.id);
        return;
      }
      
      console.log(`📨 Sending to ${messageRecipients.length} recipients...`);
      
      // Import EmailService dynamically to avoid circular dependencies
      const { EmailService } = await import('./email-service');
      
      // Send email to each recipient
      let successCount = 0;
      let errorCount = 0;
      
      for (const recipient of messageRecipients) {
        try {
          console.log(`  → Sending to ${recipient.email}...`);
          
          // Prepare attachments array
          const attachments: any[] = [];
          
          // Add video attachment if present
          if (message.cipherBlobUrl) {
            attachments.push({
              filename: 'video-message.mp4',
              content: message.cipherBlobUrl,
              contentType: 'video/mp4'
            });
          }
          
          // Add audio attachment if present
          if (message.audioRecording) {
            attachments.push({
              filename: 'audio-message.webm',
              content: message.audioRecording,
              contentType: 'audio/webm'
            });
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
                  content: file.url || `File attachment: ${file.name}`,
                  contentType: file.type || 'application/octet-stream'
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
            messageType: (message.types?.[0] as 'EMAIL' | 'VIDEO' | 'VOICE' | 'FILE') || 'EMAIL',
            attachments: attachments.length > 0 ? attachments : undefined,
            senderName: authUser.name
          });
          
          if (result && result.success) {
            console.log(`  ✅ Sent to ${recipient.email}`);
            successCount++;
          } else {
            console.error(`  ❌ Failed to send to ${recipient.email}:`, result?.error || 'Unknown error');
            errorCount++;
          }
        } catch (emailError) {
          console.error(`  ❌ Error sending to ${recipient.email}:`, emailError);
          errorCount++;
        }
      }
      
      console.log(`📧 Email sending complete: ${successCount} sent, ${errorCount} failed`);
      
      if (errorCount > 0 && successCount === 0) {
        // All failed - show error
        alert(`❌ Failed to send emails to all ${errorCount} recipients.\n\nCheck console for details.`);
      } else if (errorCount > 0) {
        // Some failed
        alert(`⚠️ Email sending partially completed:\n\n✅ ${successCount} emails sent successfully\n❌ ${errorCount} emails failed\n\nCheck console for details.`);
      } else {
        // All succeeded
        console.log('✅ All emails sent successfully!');
      }
      
    } catch (error) {
      console.error('❌ Error in sendMessageEmails:', error);
      alert(`❌ Failed to send emails: ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck console for details.`);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!authUser.id) throw new Error('User not authenticated');

    try {
      // FORCE Supabase only - NO localStorage fallback
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase not configured - localStorage fallback disabled');
      }
      
      // Check if user is authenticated with Supabase (has a valid session)
      const { data: { session } } = await supabase.auth.getSession();
      const isSupabaseUser = session?.user;
      
      if (!isSupabaseUser) {
        throw new Error('User not authenticated with Supabase - localStorage fallback disabled');
      }
      
      console.log('Marking message as deleted in Supabase database');
      await markAsDeletedInDatabase(id);
    } catch (error) {
      console.error('Error marking message as deleted:', error);
      throw error; // NO FALLBACK - force user to fix Supabase configuration
    }
  };

  const markAsDeletedInDatabase = async (id: string) => {
    if (!supabase) throw new Error('Supabase not configured');

    // Find the message to get media URLs before deletion
    const messageToDelete = messages.find(msg => msg.id === id);
    
    // Delete the message from database (but keep media files in storage)
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting message from database:', error);
      throw error;
    }

    console.log('Message deleted from database successfully');
    console.log('Media files preserved in Supabase Storage for reuse:', {
      videoUrl: messageToDelete?.cipherBlobUrl,
      audioUrl: messageToDelete?.audioRecording,
      thumbnailUrl: messageToDelete?.thumbnailUrl
    });
    
    // Update local state immediately by removing the deleted message
    const updatedMessages = messages.filter(msg => msg.id !== id);
    setMessages(updatedMessages);
    
    // Don't refresh immediately - the optimistic update should be sufficient
    // The message will be refreshed on next page load or manual refresh
  };

  // REMOVED: markAsDeletedInLocalStorage - localStorage fallback disabled

  const refreshMessages = async () => {
    setIsLoading(true);
    await fetchMessages();
  };

  const loadDeletedMessages = async () => {
    if (!authUser.id) return [];

    try {
      // FORCE Supabase only - NO localStorage fallback
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase not configured - localStorage fallback disabled');
      }
      
      // Check if user is authenticated with Supabase (has a valid session)
      const { data: { session } } = await supabase.auth.getSession();
      const isSupabaseUser = session?.user;
      
      if (!isSupabaseUser) {
        throw new Error('User not authenticated with Supabase - localStorage fallback disabled');
      }

      let query = supabase
        .from('messages')
        .select('*')
        .eq('deleted', true)
        .order('deletedAt', { ascending: false });

      if (authUser.id !== 'admin-user-id') {
        query = query.eq('userId', authUser.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((msg: any) => ({
        ...msg,
        types: Array.isArray(msg.types) ? msg.types : (msg.types ? [msg.types] : ['EMAIL']),
        createdAt: new Date(msg.createdAt),
        updatedAt: new Date(msg.updatedAt),
        scheduledFor: msg.scheduledFor ? new Date(msg.scheduledFor) : undefined,
        deletedAt: msg.deletedAt ? new Date(msg.deletedAt) : undefined,
      }));
    } catch (error) {
      console.error('Error loading deleted messages:', error);
      throw error; // NO FALLBACK - force user to fix Supabase configuration
    }
  };

  return {
    messages,
    isLoading,
    recipients, // Add recipients to return object
    createMessage,
    updateMessage,
    deleteMessage,
    refreshMessages,
    loadDeletedMessages,
  };
}