import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMessages } from "@/lib/use-messages";
import { EmailPreviewDialog } from "./email-preview-dialog";
import { EditMessageDialog } from "@/components/dashboard/edit-message-dialog";
import { Edit, Trash2, Send, Clock, Mail, Video, Mic, FileText, Copy, Shield, Eye, HardDrive, Cloud } from "lucide-react";
import { format } from "date-fns";
import { useRecipients } from "@/lib/use-recipients";
import { EmailService } from "@/lib/email-service";
import { toast } from "../../../hooks/use-toast";

export function ScheduledMessageList() {
  const { messages, deleteMessage, updateMessage, createMessage } = useMessages();
  const { recipients } = useRecipients();
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [previewingMessage, setPreviewingMessage] = useState<any>(null);

  // Filter messages by status
  const scheduledMessages = messages.filter(m => m.status === 'SCHEDULED');
  const sentMessages = messages.filter(m => m.status === 'SENT');

  const getMessageIcons = (types: string[] | string) => {
    // Handle backward compatibility with single type
    const typeArray = Array.isArray(types) ? types : (types ? [types] : ['EMAIL']);
    
    return typeArray.map(type => {
      switch (type) {
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
    });
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
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
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'SENT':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isMessageStoredLocally = (message: any) => {
    // Check if the message ID format suggests it's a legacy/local message
    // Legacy IDs are typically not UUIDs (like 'admin-user-id', 'demo-user-id', etc.)
    const isLegacyId = !message.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    
    // Also check if we have user info (which indicates it's from localStorage aggregation)
    const hasUserInfo = message.userName && message.userEmail;
    
    return isLegacyId || hasUserInfo;
  };

  const handleSendNow = (message: any) => {
    if (confirm(`Are you sure you want to send "${message.title}" now?`)) {
      const updatedMessage = {
        ...message,
        status: 'SENT',
        sentAt: new Date().toISOString()
      };
      updateMessage(message.id, updatedMessage);
    }
  };

  const handleDuplicateMessage = async (message: any) => {
    const duplicatedMessage = {
      title: `${message.title} (Copy)`,
      content: message.content,
      types: message.types || ['EMAIL'],
      recipientIds: message.recipientIds || [],
      scope: message.scope || 'NORMAL',
      status: 'DRAFT',
      // Don't copy scheduled time - let user set new schedule
    };
    
    await createMessage(duplicatedMessage);
  };

  const handleResendMessage = async (message: any) => {
    try {
      // Get recipients for this message
      const messageRecipients = recipients.filter(recipient => 
        message.recipientIds.includes(recipient.id)
      );

      if (messageRecipients.length === 0) {
        toast({
          title: "No Recipients",
          description: "This message has no recipients to send to.",
          variant: "destructive",
        });
        return;
      }

      // Prepare attachments for email
      const attachments = [];
      
      // Add video attachment if present
      if (message.cipherBlobUrl || message.videoRecording) {
        const videoUrl = message.cipherBlobUrl || message.videoRecording;
        attachments.push({
          filename: 'video-message.mp4',
          content: videoUrl,
          contentType: 'video/mp4'
        });
      }
      
      // Add audio attachment if present
      if (message.audioRecording) {
        attachments.push({
          filename: 'audio-message.mp3',
          content: message.audioRecording,
          contentType: 'audio/mpeg'
        });
      }
      
      // Add file attachments if present
      if (message.attachments && message.attachments.length > 0) {
        message.attachments.forEach((file: any) => {
          attachments.push({
            filename: file.name,
            content: file.content || '',
            contentType: file.type
          });
        });
      }

      // Send email to each recipient
      let successCount = 0;
      let errorCount = 0;

      for (const recipient of messageRecipients) {
        try {
          const result = await EmailService.sendEmail({
            messageId: message.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            subject: message.title,
            content: message.content,
            messageType: message.types?.[0] || 'EMAIL',
            attachments: attachments
          });

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed to send to ${recipient.email}:`, result.error);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error sending to ${recipient.email}:`, error);
        }
      }

      // Update message status
      if (successCount > 0) {
        await updateMessage(message.id, {
          ...message,
          status: 'SENT',
          sentAt: new Date().toISOString(),
        });
      }

      // Show result toast
      if (errorCount === 0) {
        toast({
          title: "Message Resent Successfully",
          description: `Successfully sent to ${successCount} recipient(s).`,
        });
      } else if (successCount > 0) {
        toast({
          title: "Message Partially Sent",
          description: `Sent to ${successCount} recipient(s), ${errorCount} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Resend Failed",
          description: `Failed to send to all ${errorCount} recipient(s).`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error resending message:', error);
      toast({
        title: "Resend Error",
        description: "An unexpected error occurred while resending the message.",
        variant: "destructive",
      });
    }
  };

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
          <p className="text-gray-500 text-center mb-6">
            Create your first message to get started with Legacy Scheduler
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Scheduled Messages Section */}
        {scheduledMessages.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Scheduled Messages ({scheduledMessages.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scheduledMessages.map((message) => {
          const Icons = getMessageIcons(message.types || message.type);
          const isOverdue = message.scheduledFor && 
            new Date(message.scheduledFor) < new Date() && 
            message.status === 'SCHEDULED';

          return (
            <Card key={message.id} className={`${isOverdue ? 'border-orange-200 bg-orange-50' : ''} relative`}>
              {/* Storage indicator in bottom-right corner */}
              <div className="absolute bottom-2 right-2 z-10">
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                  isMessageStoredLocally(message) 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {isMessageStoredLocally(message) ? (
                    <>
                      <HardDrive className="h-3 w-3" />
                      <span>Local</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="h-3 w-3" />
                      <span>Server</span>
                    </>
                  )}
                </div>
              </div>
              
              <CardHeader className="pb-2 px-3 pt-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      {Icons.map((Icon, index) => (
                        <Icon key={index} className={`h-4 w-4 ${isOverdue ? 'text-orange-600' : 'text-primary'}`} />
                      ))}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium leading-tight">{message.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={`${getStatusColor(message.status)} text-xs px-1.5 py-0.5`}>
                          {message.status}
                        </Badge>
                        {message.scope === 'DMS' && (
                          <Badge className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5">
                            <Shield className="h-3 w-3 mr-1" />
                            DMS
                          </Badge>
                        )}
                        {isOverdue && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs px-1.5 py-0.5">
                            Overdue
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {message.recipientIds?.length || 0} recipients
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {message.status === 'SCHEDULED' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1 h-6"
                        onClick={() => handleSendNow(message)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Send
                      </Button>
                      {message.types.includes('EMAIL') && (
                        <Button 
                          onClick={() => setPreviewingMessage(message)}
                          variant="outline"
                          size="sm"
                          className="text-xs px-2 py-1 h-6"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      )}
                    </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1 h-6"
                      onClick={() => setEditingMessage(message)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1 h-6"
                      onClick={() => handleDuplicateMessage(message)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    {(message.status === 'SENT' || message.status === 'FAILED') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs px-2 py-1 h-6"
                        onClick={() => handleResendMessage(message)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Resend
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1 h-6"
                      onClick={() => deleteMessage(message.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-1">
                <div className="space-y-2">
                  <p className="text-gray-600 line-clamp-2 text-xs leading-relaxed">{message.content}</p>
                  
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-700">Created:</span>
                      <div className="text-gray-600 text-xs">
                        {format(new Date(message.createdAt), 'MMM d, yyyy HH:mm')}
                      </div>
                    </div>
                    
                    {message.scheduledFor && (
                      <div>
                        <span className="font-medium text-gray-700">Scheduled:</span>
                        <div className={`${isOverdue ? 'text-orange-600 font-medium' : 'text-gray-600'} text-xs`}>
                          {format(new Date(message.scheduledFor), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                    )}
                    
                    {message.sentAt && (
                      <div>
                        <span className="font-medium text-gray-700">Sent:</span>
                        <div className="text-green-600 text-xs">
                          {format(new Date(message.sentAt), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                    )}
                  </div>

                  {message.recipientIds && message.recipientIds.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700 text-xs">Recipients:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {message.recipientIds.slice(0, 3).map((recipientId: string, index: number) => {
                          const recipient = recipients.find(r => r.id === recipientId);
                          return (
                            <div key={index} className="flex items-center space-x-1">
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                {recipient?.name || 'Unknown'}
                              </Badge>
                              {message.scope === 'DMS' && (
                                <Badge className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5">
                                  <Shield className="h-3 w-3 mr-1" />
                                  DMS
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                        {message.recipientIds.length > 3 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            +{message.recipientIds.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
          </div>
        </div>
      )}

      {/* Sent Messages Section */}
      {sentMessages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Sent Messages ({sentMessages.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sentMessages.map((message) => {
              const Icons = getMessageIcons(message.types || message.type);
              
              return (
                <Card key={message.id} className="relative">
                  {/* Storage indicator in bottom-right corner */}
                  <div className="absolute bottom-2 right-2 z-10">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                      isMessageStoredLocally(message) 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                        : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {isMessageStoredLocally(message) ? (
                        <>
                          <HardDrive className="h-3 w-3" />
                          <span>Local</span>
                        </>
                      ) : (
                        <>
                          <Cloud className="h-3 w-3" />
                          <span>Server</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <CardHeader className="pb-2 px-3 pt-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          {Icons.map((Icon, index) => (
                            <Icon key={index} className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ))}
                        </div>
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          SENT
                        </Badge>
                        {message.scope === 'DMS' && (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            DMS
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-3 pb-3">
                    <h4 className="font-semibold text-sm mb-1">{message.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {message.content}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{message.scheduledFor ? format(new Date(message.scheduledFor), 'MMM d, yyyy HH:mm') : 'No time'}</span>
                      </div>
                      <div>
                        {message.recipientIds.length} recipient{message.recipientIds.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => setEditingMessage(message)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => handleDuplicateMessage(message)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => setPreviewingMessage(message)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state if no messages */}
      {scheduledMessages.length === 0 && sentMessages.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No scheduled or sent messages</h3>
            <p className="text-gray-500 text-center mb-6">
              Create your first message to get started with Legacy Scheduler
            </p>
          </CardContent>
        </Card>
      )}
    </div>

    {/* Dialogs */}
    {editingMessage && (
      <EditMessageDialog
        message={editingMessage}
        open={!!editingMessage}
        onOpenChange={() => setEditingMessage(null)}
        onSave={(updatedMessage) => {
          updateMessage(editingMessage.id, updatedMessage);
          setEditingMessage(null);
        }}
      />
    )}

    {previewingMessage && (
      <EmailPreviewDialog
        open={!!previewingMessage}
        onOpenChange={() => setPreviewingMessage(null)}
        subject={previewingMessage.title}
        content={previewingMessage.content}
        recipientName="Preview Recipient"
        senderName="Your Name"
        message={previewingMessage}
      />
    )}
    </>
  );
}