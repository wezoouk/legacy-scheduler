import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { EditMessageDialog } from '@/components/dashboard/edit-message-dialog';
import { CreateMessageDialog } from '@/components/dashboard/create-message-dialog';
import { useMessages } from '@/lib/use-messages';
import { useRecipients } from '@/lib/use-recipients';
import { 
  Mail, 
  Video, 
  Mic, 
  FileText, 
  Calendar as CalendarIcon,
  Clock,
  Edit,
  Send,
  Trash2,
  Copy,
  Shield,
  HardDrive,
  Cloud,
  ChevronLeft,
  ChevronRight,
  Users
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday } from 'date-fns';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const { messages, updateMessage, deleteMessage, createMessage } = useMessages();
  const { recipients } = useRecipients();

  const scheduledMessages = messages.filter(m => m.scheduledFor);

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
      case 'EMAIL': return Mail;
      case 'VIDEO': return Video;
      case 'VOICE': return Mic;
      case 'FILE': return FileText;
      default: return Mail;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'SENT': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const getMessagesForDate = (date: Date) => {
    return scheduledMessages.filter(message => 
      message.scheduledFor && isSameDay(message.scheduledFor, date)
    );
  };

  const getScheduledMessagesForDate = (date: Date) => {
    return getMessagesForDate(date).filter(message => message.status === 'SCHEDULED');
  };

  const getSentMessagesForDate = (date: Date) => {
    return getMessagesForDate(date).filter(message => message.status === 'SENT');
  };

  const selectedDateMessages = selectedDate ? getMessagesForDate(selectedDate) : [];
  const scheduledMessagesForDate = selectedDate ? getScheduledMessagesForDate(selectedDate) : [];
  const sentMessagesForDate = selectedDate ? getSentMessagesForDate(selectedDate) : [];

  const handleSendNow = (messageId: string, messageTitle: string) => {
    if (confirm(`Are you sure you want to send "${messageTitle}" now? This will deliver the email immediately.`)) {
      updateMessage(messageId, { 
        status: 'SENT', 
        scheduledFor: undefined,
        sentAt: new Date().toISOString()
      });
    }
  };

  const handleDeleteMessage = (messageId: string, messageTitle: string) => {
    if (confirm(`Are you sure you want to delete "${messageTitle}"?`)) {
      deleteMessage(messageId);
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

  const getRecipientNames = (recipientIds: string[]) => {
    return recipientIds
      .map(id => recipients.find(r => r.id === id)?.name || 'Unknown')
      .join(', ');
  };

  const previousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowCreateDialog(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Message Calendar</h2>
        <p className="text-muted-foreground">
          View your scheduled messages in calendar format
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  {format(currentDate, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={previousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CustomCalendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateClick}
                month={currentDate}
                onMonthChange={setCurrentDate}
                modifiers={{
                  hasMessages: (date) => getMessagesForDate(date).length > 0,
                }}
                modifiersStyles={{
                  hasMessages: { 
                    backgroundColor: '#3b82f6', 
                    color: '#ffffff',
                    fontWeight: 'bold'
                  },
                }}
                className="rounded-md border border-gray-600"
              />
              <div className="mt-4 text-sm text-gray-300">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 border border-blue-400 rounded"></div>
                    <span>Has scheduled messages</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Date Messages */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}
              </CardTitle>
              <CardDescription>
                {scheduledMessagesForDate.length} scheduled, {sentMessagesForDate.length} sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedDateMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No messages for this date</p>
                    <p className="text-xs mt-2">Click on a date to create a new message</p>
                  </div>
                ) : (
                  <>
                    {/* Scheduled Messages */}
                    {scheduledMessagesForDate.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400">Scheduled Messages</h4>
                        {scheduledMessagesForDate.map((message) => {
                          const MessageIcons = getMessageIcons(message.types || message.type);
                          const isOverdue = message.scheduledFor && message.scheduledFor < new Date() && message.status === 'SCHEDULED';

                          return (
                      <div key={message.id} className={`p-3 border rounded-lg ${isOverdue ? 'border-orange-200 bg-orange-50' : ''} relative`}>
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
                        
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              {MessageIcons.map((Icon, index) => (
                                <Icon key={index} className={`h-4 w-4 ${isOverdue ? 'text-orange-600' : 'text-primary'}`} />
                              ))}
                            </div>
                            <Badge className={getStatusColor(message.status)}>
                              {message.status}
                            </Badge>
                            {message.scope === 'DMS' && (
                              <Badge className="bg-red-100 text-red-800 text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                DMS
                              </Badge>
                            )}
                            {isOverdue && (
                              <Badge className="bg-orange-100 text-orange-800 text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </div>

                        <h4 className="font-semibold text-sm mb-1">{message.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {message.content}
                        </p>

                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{message.scheduledFor ? format(message.scheduledFor, 'HH:mm') : 'No time'}</span>
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
                              onClick={() => setEditingMessage(message.id)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            {message.status === 'SCHEDULED' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-xs text-green-600 hover:text-green-700"
                                onClick={() => handleSendNow(message.id, message.title)}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Send
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2 text-xs"
                              onClick={() => handleDuplicateMessage(message)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleDeleteMessage(message.id, message.title)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div>
                            {message.recipientIds.length} recipient{message.recipientIds.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                      </div>
                    )}

                    {/* Sent Messages - Compact View */}
                    {sentMessagesForDate.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-green-600 dark:text-green-400">Sent Messages</h4>
                        {sentMessagesForDate.map((message) => {
                          const MessageIcons = getMessageIcons(message.types || message.type);
                          
                          return (
                            <div key={message.id} className="p-2 border rounded-lg bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 relative">
                              {/* Storage indicator in bottom-right corner */}
                              <div className="absolute bottom-1 right-1 z-10">
                                <div className={`flex items-center space-x-1 px-1 py-0.5 rounded-full text-xs ${
                                  isMessageStoredLocally(message) 
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                                    : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                                }`}>
                                  {isMessageStoredLocally(message) ? (
                                    <>
                                      <HardDrive className="h-2 w-2" />
                                      <span>Local</span>
                                    </>
                                  ) : (
                                    <>
                                      <Cloud className="h-2 w-2" />
                                      <span>Server</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                  <div className="flex space-x-1">
                                    {MessageIcons.map((Icon, index) => (
                                      <Icon key={index} className="h-3 w-3 text-green-600 dark:text-green-400" />
                                    ))}
                                  </div>
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                                    SENT
                                  </Badge>
                                  {message.scope === 'DMS' && (
                                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">
                                      <Shield className="h-2 w-2 mr-1" />
                                      DMS
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                  <Clock className="h-2 w-2" />
                                  <span>{message.scheduledFor ? format(message.scheduledFor, 'HH:mm') : 'No time'}</span>
                                </div>
                              </div>

                              <h5 className="font-medium text-sm mb-1 line-clamp-1">{message.title}</h5>
                              <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                                {message.content}
                              </p>

                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <Users className="h-2 w-2" />
                                  <span>{message.recipientIds.length} recipient{message.recipientIds.length !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-5 px-1 text-xs"
                                    onClick={() => setEditingMessage(message.id)}
                                  >
                                    <Edit className="h-2 w-2 mr-1" />
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-5 px-1 text-xs"
                                    onClick={() => handleDuplicateMessage(message)}
                                  >
                                    <Copy className="h-2 w-2 mr-1" />
                                    Copy
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EditMessageDialog
        open={editingMessage !== null}
        onOpenChange={(open) => !open && setEditingMessage(null)}
        message={messages.find(m => m.id === editingMessage) || null}
      />

      <CreateMessageDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        initialScheduledFor={selectedDate}
      />
    </div>
  );
}