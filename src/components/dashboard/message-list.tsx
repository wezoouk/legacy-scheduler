import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMessages } from "@/lib/use-messages";
import { DeliveryStatusBadge } from "./delivery-status-badge";
import { MessageDeliveryDetails } from "./message-delivery-details";
import { EmailPreviewDialog } from "./email-preview-dialog";
import { VideoPreviewDialog } from "./video-preview-dialog";
import { AudioPreviewDialog } from "./audio-preview-dialog";
import { useRecipients } from "@/lib/use-recipients";
import { EditMessageDialog } from "@/components/dashboard/edit-message-dialog";
import { EmailService } from "@/lib/email-service";
import { toast } from "../../../hooks/use-toast";
import { Edit, Trash2, Send, Clock, Mail, Video, Mic, FileText, Shield, TrendingUp, Copy, Eye, RefreshCw, HardDrive, Cloud, Play, Volume2 } from "lucide-react";
import { format } from "date-fns";

export function MessageList() {
  const { messages, deleteMessage, updateMessage, createMessage, recipients, refreshMessages, isLoading } = useMessages();
  const { recipients: allRecipients } = useRecipients();
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [viewingDelivery, setViewingDelivery] = useState<any>(null);
  const [previewingMessage, setPreviewingMessage] = useState<any>(null);
  const [previewingVideo, setPreviewingVideo] = useState<any>(null);
  
  // Debug dialog state changes
  useEffect(() => {
    console.log('previewingVideo state changed:', previewingVideo);
  }, [previewingVideo]);
  const [previewingAudio, setPreviewingAudio] = useState<any>(null);

  // Debug: Log messages with media
  console.log('All messages:', messages.map(m => ({
    title: m.title,
    types: m.types,
    hasVideoType: m.types?.includes('VIDEO') || m.type === 'VIDEO',
    hasAudioType: m.types?.includes('VOICE') || m.type === 'VOICE',
    hasVideo: !!m.cipherBlobUrl,
    hasAudio: !!(m.audioRecording || m.cipherBlobUrl),
    audioUrl: m.audioRecording || m.cipherBlobUrl,
    videoUrl: m.cipherBlobUrl,
    status: m.status,
    content: m.content?.substring(0, 50) + '...',
    fullMessage: m // Log the full message object
  })));

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
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'SENT':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
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
    try {
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
    } catch (error) {
      console.error('Error duplicating message:', error);
      alert(`Failed to duplicate message: ${error.message}\n\nPlease check your Supabase configuration.`);
    }
  };

  const handleResendMessage = async (message: any) => {
    try {
      // Get recipients for this message
      const messageRecipients = allRecipients.filter(recipient => 
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

      // Refresh messages to show updated status
      refreshMessages();
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Messages ({messages.length})</h2>
        <Button 
          variant="outline" 
          onClick={refreshMessages} 
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {messages.map((message) => {
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
                        <Icon key={index} className={`h-4 w-4 ${isOverdue ? 'text-orange-600' : 'text-primary'}`} />
                      ))}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium leading-tight">{message.title}</CardTitle>
                      {/* Show user info for admin view */}
                      {message.userName && (
                        <div className="text-xs text-gray-500 mb-1">
                          by {message.userName} ({message.userEmail})
                        </div>
                      )}
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
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1 h-6"
                        onClick={() => handleSendNow(message)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Send
                      </Button>
                    )}
                    {message.status === 'SENT' && message.deliveryStatus && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs px-2 py-1 h-6"
                        onClick={() => setViewingDelivery(message)}
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Status
                      </Button>
                    )}
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
                    {(message.types || []).includes('EMAIL') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs px-2 py-1 h-6"
                        onClick={() => setPreviewingMessage(message)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
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
                  {/* Check for missing media recordings */}
                  {(() => {
                    const hasVideoType = message.types?.includes('VIDEO') || message.type === 'VIDEO';
                    const hasAudioType = message.types?.includes('VOICE') || message.type === 'VOICE';
                    // Determine if cipherBlobUrl contains video or audio based on message types
                    const cipherBlobIsVideo = message.cipherBlobUrl && (message.types?.includes('VIDEO') || message.type === 'VIDEO');
                    const cipherBlobIsAudio = message.cipherBlobUrl && (message.types?.includes('VOICE') || message.type === 'VOICE');
                    
                    const hasVideoRecording = !!(message.videoRecording || cipherBlobIsVideo);
                    const hasAudioRecording = !!(message.audioRecording || cipherBlobIsAudio);
                    
                    const missingVideo = hasVideoType && !hasVideoRecording;
                    const missingAudio = hasAudioType && !hasAudioRecording;
                    
                    if (missingVideo || missingAudio) {
                      return (
                        <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-3">
                          <div className="flex items-center mb-2">
                            <Video className="h-5 w-5 text-red-600 mr-2" />
                            <span className="text-lg font-semibold text-red-800">
                              {missingVideo && missingAudio ? 'VIDEO & AUDIO RECORDING MISSING' : 
                               missingVideo ? 'VIDEO RECORDING MISSING' : 
                               'AUDIO RECORDING MISSING'}
                            </span>
                          </div>
                          <p className="text-red-700 text-sm">
                            {missingVideo && missingAudio ? 
                              'This message includes video and audio types but no recordings have been made. Please record or remove these message types.' :
                              missingVideo ? 
                              'This message includes video type but no video recording has been made. Please record a video or remove the video type.' :
                              'This message includes audio type but no audio recording has been made. Please record audio or remove the audio type.'
                            }
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <p className="text-gray-600 line-clamp-2 text-xs leading-relaxed">{message.content}</p>
                  
                  {/* Media Preview Section */}
                  {(message.cipherBlobUrl || message.audioRecording) && (
                    <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
                      {(() => {
                        console.log('Media preview rendered for:', message.title, {
                          types: message.types,
                          hasVideoType: message.types?.includes('VIDEO') || message.type === 'VIDEO',
                          hasAudioType: message.types?.includes('VOICE') || message.type === 'VOICE',
                          cipherBlobUrl: message.cipherBlobUrl,
                          audioRecording: message.audioRecording
                        });
                        return null;
                      })()}
                      <div className="space-y-3">
                        {/* Video Preview */}
                        {message.cipherBlobUrl && (message.types?.includes('VIDEO') || message.type === 'VIDEO') && (
                          <>
                            {(() => {
                              console.log('Rendering VIDEO preview for:', message.title);
                              return null;
                            })()}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="relative cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Video thumbnail clicked - preventing default');
                                  console.log('Message:', message);
                                  console.log('Video URL:', message.cipherBlobUrl || message.videoRecording);
                                  console.log('Setting previewingVideo to:', message);
                                  setPreviewingVideo(message);
                                  return false;
                                }}
                                onMouseDown={(e) => e.preventDefault()}
                                onContextMenu={(e) => e.preventDefault()}
                              >
                                <video
                                  className="w-16 h-12 bg-black rounded object-cover"
                                  src={message.cipherBlobUrl}
                                  preload="metadata"
                                  muted
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Video element clicked - preventing default');
                                    setPreviewingVideo(message);
                                    return false;
                                  }}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onContextMenu={(e) => e.preventDefault()}
                                  controls={false}
                                  style={{ pointerEvents: 'none' }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded">
                                  <Play className="w-4 h-4 text-white" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-100">Video Message</p>
                                    <p className="text-xs text-gray-400">Click to preview</p>
                                    {/* Debug test button removed */}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs px-2 py-1 h-6"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('Video preview button clicked');
                                      console.log('Message:', message);
                                      console.log('Video URL:', message.cipherBlobUrl);
                                      setPreviewingVideo(message);
                                    }}
                                  >
                                    <Play className="h-3 w-3 mr-1" />
                                    Preview
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Message Details Under Video */}
                            <div className="ml-20 pl-1 space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-medium text-gray-300">Message:</span>
                                <span className="text-xs text-gray-100 font-medium">{message.title}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-medium text-gray-300">Status:</span>
                                <Badge className={`text-xs px-1.5 py-0.5 ${
                                  message.status === 'SENT' ? 'bg-green-100 text-green-800' :
                                  message.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                                  message.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {message.status}
                                </Badge>
                                {message.scope === 'DMS' && (
                                  <Badge className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5">
                                    <Shield className="h-3 w-3 mr-1" />
                                    DMS
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-medium text-gray-300">Recipients:</span>
                                <span className="text-xs text-gray-400">{message.recipientIds?.length || 0}</span>
                                <span className="text-xs font-medium text-gray-300">Created:</span>
                                <span className="text-xs text-gray-400">
                                  {format(new Date(message.createdAt), 'MMM d, HH:mm')}
                                </span>
                              </div>
                              {message.scheduledFor && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-medium text-gray-300">Scheduled:</span>
                                  <span className={`text-xs ${
                                    new Date(message.scheduledFor) < new Date() && message.status === 'SCHEDULED'
                                      ? 'text-orange-400 font-medium'
                                      : 'text-gray-400'
                                  }`}>
                                    {format(new Date(message.scheduledFor), 'MMM d, HH:mm')}
                                  </span>
                                </div>
                              )}
                              {message.sentAt && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-medium text-gray-300">Sent:</span>
                                  <span className="text-xs text-green-400">
                                    {format(new Date(message.sentAt), 'MMM d, HH:mm')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          </>
                        )}
                        
                        {/* Audio Preview - Narrow Button Style */}
                        {(message.audioRecording || (message.cipherBlobUrl && (message.types?.includes('VOICE') || message.type === 'VOICE'))) && (
                          <>
                            {(() => {
                              console.log('Rendering AUDIO preview for:', message.title);
                              return null;
                            })()}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                className="flex-1 px-3 py-1 text-left justify-start items-start bg-gray-900 hover:bg-gray-800 border-gray-700 text-gray-100"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Audio button clicked');
                                  console.log('Message:', message);
                                  console.log('Audio URL:', message.audioRecording || message.cipherBlobUrl);
                                  setPreviewingAudio(message);
                                }}
                              >
                                <Volume2 className="h-4 w-4 mr-2 text-green-600" />
                                <div className="flex-1 min-w-0 leading-4 pb-1">
                                  <p className="text-sm font-medium text-gray-100 truncate">Audio Message</p>
                                  <p className="text-xs text-gray-400 truncate">Click to play</p>
                                </div>
                                <Play className="h-5 w-5 text-gray-400" />
                              </Button>
                            </div>
                            
                            {/* Message Details Under Audio */}
                            <div className="pl-3 space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-medium text-gray-700">Message:</span>
                                <span className="text-xs text-gray-900 font-medium">{message.title}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-medium text-gray-700">Status:</span>
                                <Badge className={`text-xs px-1.5 py-0.5 ${
                                  message.status === 'SENT' ? 'bg-green-100 text-green-800' :
                                  message.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                                  message.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {message.status}
                                </Badge>
                                {message.scope === 'DMS' && (
                                  <Badge className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5">
                                    <Shield className="h-3 w-3 mr-1" />
                                    DMS
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-medium text-gray-700">Recipients:</span>
                                <span className="text-xs text-gray-600">{message.recipientIds?.length || 0}</span>
                                <span className="text-xs font-medium text-gray-700">Created:</span>
                                <span className="text-xs text-gray-600">
                                  {format(new Date(message.createdAt), 'MMM d, HH:mm')}
                                </span>
                              </div>
                              {message.scheduledFor && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-medium text-gray-700">Scheduled:</span>
                                  <span className={`text-xs ${
                                    new Date(message.scheduledFor) < new Date() && message.status === 'SCHEDULED'
                                      ? 'text-orange-600 font-medium'
                                      : 'text-gray-600'
                                  }`}>
                                    {format(new Date(message.scheduledFor), 'MMM d, HH:mm')}
                                  </span>
                                </div>
                              )}
                              {message.sentAt && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-medium text-gray-700">Sent:</span>
                                  <span className="text-xs text-green-600">
                                    {format(new Date(message.sentAt), 'MMM d, HH:mm')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
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

                  {message.recipients && message.recipients.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700 text-xs">Recipients:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {message.recipientIds.slice(0, 3).map((recipientId: string, index: number) => {
                          const recipient = allRecipients.find(r => r.id === recipientId);
                          const deliveryStatus = message.deliveryStatus?.[recipientId];
                          return (
                            <div key={index} className="flex items-center space-x-1">
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                {recipient?.name || 'Unknown'}
                              </Badge>
                              {deliveryStatus && (
                                <DeliveryStatusBadge 
                                  status={deliveryStatus.status}
                                  timestamp={deliveryStatus.deliveredAt ? new Date(deliveryStatus.deliveredAt) : undefined}
                                  bounceReason={deliveryStatus.bounceReason}
                                />
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

      {viewingDelivery && (
        <MessageDeliveryDetails
          message={viewingDelivery}
          open={!!viewingDelivery}
          onOpenChange={() => setViewingDelivery(null)}
        />
      )}

      {previewingMessage && (
        <EmailPreviewDialog
          open={!!previewingMessage}
          onOpenChange={() => setPreviewingMessage(null)}
          subject={previewingMessage.title}
          content={previewingMessage.content}
          recipientName={
            previewingMessage.recipientIds && previewingMessage.recipientIds.length > 0
              ? recipients.find(r => r.id === previewingMessage.recipientIds[0])?.name || "Recipient"
              : "Recipient"
          }
          senderName="Your Name"
          message={previewingMessage}
        />
      )}

      {previewingVideo && (
        <VideoPreviewDialog
          open={!!previewingVideo}
          onOpenChange={() => setPreviewingVideo(null)}
          message={previewingVideo}
        />
      )}

      {previewingAudio && (
        <AudioPreviewDialog
          open={!!previewingAudio}
          onOpenChange={() => setPreviewingAudio(null)}
          message={previewingAudio}
        />
      )}
    </>
  );
}