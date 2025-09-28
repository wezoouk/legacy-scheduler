import React, { useState, useEffect } from 'react';
import { Volume2, Calendar, User, Clock, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMessages } from '@/lib/use-messages';
import { useRecipients } from '@/lib/use-recipients';
import { format, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { MediaService } from '@/lib/media-service';

interface AudioSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAudio: (audioUrl: string, messageTitle: string) => void;
}

export function AudioSelectionDialog({ open, onOpenChange, onSelectAudio }: AudioSelectionDialogProps) {
  const { messages } = useMessages();
  const { recipients } = useRecipients();
  const [audioMessages, setAudioMessages] = useState<any[]>([]);
  const [storageAudios, setStorageAudios] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ url: string; title: string } | null>(null);

  const formatDisplayName = (rawName: string) => {
    let name = (rawName || '').replace(/\.[a-z0-9]+$/i, '');
    name = name.replace(/^(\d{10,}|\d{4}-\d{2}-\d{2}|\d{8})([_-])/i, '');
    name = name.replace(/([_-])\d{10,}$/i, '');
    name = name.replace(/[._-]+/g, ' ').trim();
    name = name.replace(/\s{2,}/g, ' ');
    return name || rawName;
  };

  useEffect(() => {
    const load = async () => {
      // Filter messages that have audio content
      const audios = messages.filter(message => 
        (message.types?.includes('VOICE') || message.type === 'VOICE') &&
        (message.audioRecording || message.cipherBlobUrl)
      );
      // Sort newest first
      audios.sort((a: any, b: any) => {
        const ad = (a.updatedAt || a.createdAt || 0);
        const bd = (b.updatedAt || b.createdAt || 0);
        return new Date(bd).getTime() - new Date(ad).getTime();
      });
      setAudioMessages(audios);

      // Load latest from storage
      try {
        const lists = await Promise.all([
          MediaService.listFiles('uploads').catch(() => []),
          MediaService.listFiles('audio').catch(() => []),
          MediaService.listFiles('voice').catch(() => []),
          MediaService.listFiles('recordings').catch(() => []),
        ]);
        const all = (lists.flat() as any[]);
        const items = all.filter(f => /\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(f.name));
        items.sort((a: any, b: any) => ( (b.updated_at || b.created_at || '')?.localeCompare(a.updated_at || a.created_at || '') ));
        setStorageAudios(items.slice(0, 24).map((f: any) => ({
          id: `media-${f.path}`,
          title: f.name,
          url: MediaService.getPublicUrl(f.path),
          createdAt: (f.updated_at || f.created_at || new Date().toISOString()),
          path: f.path,
        })));
      } catch (e) {
        console.error('Failed to load audios from storage:', e);
      }
    };
    load();
  }, [messages]);

  const getDeliveryStatus = (message: any) => {
    if (message.status === 'SENT') {
      return { status: 'SENT', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    } else if (message.status === 'SCHEDULED') {
      return { status: 'SCHEDULED', color: 'bg-blue-100 text-blue-800', icon: Clock };
    } else if (message.status === 'DRAFT') {
      return { status: 'DRAFT', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    }
    return { status: 'PENDING', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
  };

  const getRecipientNames = (message: any) => {
    if (!message.recipients || message.recipients.length === 0) return 'No recipients';
    
    const recipientNames = message.recipients.map((recipientId: string) => {
      const recipient = recipients.find(r => r.id === recipientId);
      return recipient ? recipient.name : 'Unknown';
    });
    
    return recipientNames.join(', ');
  };

  const handleSelectAudio = (message: any) => {
    const audioUrl = message.audioRecording || message.cipherBlobUrl;
    console.log('Audio selection dialog - handleSelectAudio:', {
      message,
      audioUrl,
      audioRecording: message.audioRecording,
      cipherBlobUrl: message.cipherBlobUrl,
      title: message.title
    });
    if (audioUrl) {
      onSelectAudio(audioUrl, message.title);
      onOpenChange(false);
    } else {
      console.error('No audio URL found in message:', message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Existing Audio</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {audioMessages.length === 0 && storageAudios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audio recordings found. Record audio first to select from existing recordings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Storage Audios */}
              {storageAudios.map((audio) => {
                const audioUrl = audio.url;
                const deliveryStatus = { status: 'MEDIA', color: 'bg-purple-100 text-purple-800', icon: Volume2 };
                const StatusIcon = deliveryStatus.icon;
                
                return (
                  <Card 
                    key={audio.id} 
                    className={`cursor-pointer hover:shadow-md transition-shadow group ${selectedId === audio.id ? 'ring-2 ring-white/80' : ''}`}
                    onClick={() => { setSelectedId(audio.id); setSelectedItem({ url: audio.url, title: audio.title }); }}
                    onDoubleClick={() => { onSelectAudio(audio.url, audio.title); onOpenChange(false); }}
                  >
                    <CardContent className="p-0">
                      <div className="relative aspect-video bg-gradient-to-br from-green-500 to-blue-600 rounded-t-lg overflow-hidden">
                        {/* Audio Waveform Visualization */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex items-center space-x-1">
                            {[...Array(20)].map((_, i) => (
                              <div
                                key={i}
                                className="bg-white/30 rounded-sm transition-all duration-300 group-hover:bg-white/50"
                                style={{
                                  width: '3px',
                                  height: `${Math.random() * 40 + 20}px`,
                                  animationDelay: `${i * 0.1}s`
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        
                        {/* Audio Icon Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-white/20">
                            <Volume2 className="w-8 h-8 text-white fill-white" />
                          </div>
                        </div>
                        
                        {/* Status badge overlay */}
                        <div className="absolute top-2 left-2">
                          <Badge className={`${deliveryStatus.color} text-xs px-2 py-1`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            MEDIA
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Audio info */}
                      <div className="p-3">
                        <h3 className="font-medium text-sm text-foreground truncate" title={formatDisplayName(audio.title)}>
                          {formatDisplayName(audio.title)}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          Media Library
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {/* Database Messages */}
              {audioMessages.map((message) => {
                const audioUrl = message.audioRecording || message.cipherBlobUrl;
                const deliveryStatus = getDeliveryStatus(message);
                const StatusIcon = deliveryStatus.icon;
                
                return (
                  <Card 
                    key={message.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow group"
                    onClick={() => handleSelectAudio(message)}
                  >
                    <CardContent className="p-0">
                      <div className="relative aspect-video bg-gradient-to-br from-green-500 to-blue-600 rounded-t-lg overflow-hidden">
                        {/* Audio Waveform Visualization */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex items-center space-x-1">
                            {[...Array(20)].map((_, i) => (
                              <div
                                key={i}
                                className="bg-white/30 rounded-sm transition-all duration-300 group-hover:bg-white/50"
                                style={{
                                  width: '3px',
                                  height: `${Math.random() * 40 + 20}px`,
                                  animationDelay: `${i * 0.1}s`
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        
                        {/* Audio Icon Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-white/20">
                            <Volume2 className="w-8 h-8 text-white fill-white" />
                          </div>
                        </div>
                        
                        {/* Status badge overlay */}
                        <div className="absolute top-2 left-2">
                          <Badge className={`${deliveryStatus.color} text-xs px-2 py-1`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {deliveryStatus.status}
                          </Badge>
                        </div>
                        
                        {/* DMS badge overlay */}
                        {message.scope === 'DMS' && (
                          <div className="absolute top-2 left-20">
                            <Badge className="bg-red-100 text-red-800 text-xs px-2 py-1">
                              <Shield className="w-3 h-3 mr-1" />
                              DMS
                            </Badge>
                          </div>
                        )}
                        
                        {/* Date overlay */}
                        <div className="absolute bottom-2 left-2 right-2 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b">
                          <div className="flex items-center text-white text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            {format(new Date(message.createdAt), 'MMM d, HH:mm')}
                          </div>
                        </div>
                      </div>
                      
                      {/* Message details */}
                      <div className="p-3 space-y-1">
                        <h3 className="font-medium text-sm text-foreground truncate" title={message.title}>
                          {message.title}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate" title={getRecipientNames(message)}>
                          <User className="w-3 h-3 inline mr-1" />
                          {getRecipientNames(message)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
