import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMessages } from '@/lib/use-messages';
import { useRecipients } from '@/lib/use-recipients';
import { EditMessageDialog } from '@/components/dashboard/edit-message-dialog';
import { EmailPreviewDialog } from '@/components/dashboard/email-preview-dialog';
import { 
  Mail, 
  Search, 
  Calendar, 
  Users, 
  Edit,
  Trash2,
  Eye,
  Send,
  Video,
  Mic,
  FileText,
  Filter,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';

export function AdminMessages() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [previewingMessage, setPreviewingMessage] = useState<any>(null);
  
  const { messages, deleteMessage, updateMessage } = useMessages();
  const { recipients } = useRecipients();

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         message.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || message.status === selectedStatus;
    const matchesType = selectedType === 'all' || message.types.includes(selectedType);
    return matchesSearch && matchesStatus && matchesType;
  });

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

  const getRecipientNames = (recipientIds: string[]) => {
    return recipientIds
      .map(id => recipients.find(r => r.id === id)?.name || 'Unknown')
      .join(', ');
  };

  const handleSendNow = (messageId: string) => {
    updateMessage(messageId, { status: 'SENT' });
  };

  const handleDeleteMessage = (messageId: string) => {
    if (confirm('Are you sure you want to delete this message?')) {
      deleteMessage(messageId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Message Management</h1>
          <p className="text-gray-600 mt-2">
            View and manage all platform messages
          </p>
        </div>
        <Button onClick={() => window.location.href = '/dashboard'}>
          <Plus className="w-4 h-4 mr-2" />
          Create Message
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages by title or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
              </select>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="all">All Types</option>
                <option value="EMAIL">Email</option>
                <option value="VIDEO">Video</option>
                <option value="VOICE">Voice</option>
                <option value="FILE">File</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Messages ({filteredMessages.length})</CardTitle>
          <CardDescription className="text-sm">
            Complete overview of platform messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {filteredMessages.map((message) => {
              const MessageIcon = getMessageIcon(message.types?.[0] || 'EMAIL');
              const isOverdue = message.scheduledFor && 
                new Date(message.scheduledFor) < new Date() && 
                message.status === 'SCHEDULED';

              return (
                <div key={message.id} className={`p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                  isOverdue ? 'border-orange-200 bg-orange-50' : ''
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-1.5 rounded ${
                        isOverdue ? 'bg-orange-200' : 'bg-gray-100'
                      }`}>
                        <MessageIcon className={`w-4 h-4 ${
                          isOverdue ? 'text-orange-600' : 'text-gray-600'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-sm text-gray-900 truncate">{message.title}</h3>
                          <Badge className={`${getStatusColor(message.status)} text-xs px-1.5 py-0.5`}>
                            {message.status}
                          </Badge>
                          {isOverdue && (
                            <Badge className="bg-orange-100 text-orange-800 text-xs px-1.5 py-0.5">
                              Overdue
                            </Badge>
                          )}
                          {message.userName && (
                            <span className="text-xs text-gray-500">by {message.userName}</span>
                          )}
                        </div>
                        
                        <div className="text-gray-600 text-xs mb-2 line-clamp-2">
                          {/<[^>]*>/g.test(message.content) ? (
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: message.content
                                  .replace(/<[^>]*>/g, ' ')
                                  .replace(/\s+/g, ' ')
                                  .trim()
                                  .substring(0, 100) + (message.content.length > 100 ? '...' : '')
                              }} 
                            />
                          ) : (
                            message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '')
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                          <div>
                            <span className="font-medium">Created:</span>
                            <div className="text-xs">{format(message.createdAt, 'MMM d, HH:mm')}</div>
                          </div>
                          
                          {message.scheduledFor && (
                            <div>
                              <span className="font-medium">Scheduled:</span>
                              <div className="text-xs">{format(message.scheduledFor, 'MMM d, HH:mm')}</div>
                            </div>
                          )}
                          
                          <div>
                            <span className="font-medium">Recipients:</span>
                            <div className="text-xs">{message.recipientIds.length} selected</div>
                          </div>
                          
                          <div>
                            <span className="font-medium">Type:</span>
                            <div className="text-xs capitalize">{(message.types?.[0] || 'EMAIL').toLowerCase()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom section with icons on left and buttons on right */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t">
                    {/* Message type icons - bottom left */}
                    <div className="flex items-center space-x-1">
                      {(message.types || ['EMAIL']).map((type: string, index: number) => {
                        const TypeIcon = getMessageIcon(type);
                        return (
                          <div 
                            key={index}
                            title={type}
                          >
                            <TypeIcon className="w-3 h-3 text-gray-600" />
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Action buttons - bottom right */}
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {message.status === 'SCHEDULED' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1 h-6"
                          onClick={() => handleSendNow(message.id)}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Send
                        </Button>
                      )}
                      {message.types?.includes('EMAIL') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs px-2 py-1 h-6"
                          onClick={() => setPreviewingMessage(message)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs px-2 py-1 h-6"
                        onClick={() => setEditingMessage(message)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 text-xs px-2 py-1 h-6"
                        onClick={() => handleDeleteMessage(message.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredMessages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No messages found matching your criteria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Message Dialog */}
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

      {/* Email Preview Dialog */}
      {previewingMessage && (
        <EmailPreviewDialog
          open={!!previewingMessage}
          onOpenChange={() => setPreviewingMessage(null)}
          subject={previewingMessage.title}
          content={previewingMessage.content}
          recipientName="Preview Recipient"
          senderName={previewingMessage.userName || "User"}
        />
      )}
    </div>
  );
}