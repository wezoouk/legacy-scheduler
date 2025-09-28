import React, { useState, useEffect } from 'react';
import { Play, Calendar, User, Clock, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMessages } from '@/lib/use-messages';
import { useRecipients } from '@/lib/use-recipients';
import { format, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { MediaService } from '@/lib/media-service';

interface VideoSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectVideo: (videoUrl: string, messageTitle: string) => void;
}

export function VideoSelectionDialog({ open, onOpenChange, onSelectVideo }: VideoSelectionDialogProps) {
  const { messages } = useMessages();
  const { recipients } = useRecipients();
  const [videoMessages, setVideoMessages] = useState<any[]>([]);
  const [storageVideos, setStorageVideos] = useState<any[]>([]);
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
      // Filter messages that have video content
      const videos = messages.filter(message => 
        (message.types?.includes('VIDEO') || message.type === 'VIDEO') &&
        (message.cipherBlobUrl || message.videoRecording)
      );
      // Sort newest first
      videos.sort((a: any, b: any) => {
        const ad = (a.updatedAt || a.createdAt || 0);
        const bd = (b.updatedAt || b.createdAt || 0);
        return new Date(bd).getTime() - new Date(ad).getTime();
      });
      setVideoMessages(videos);

      // Load latest videos from Supabase Storage
      try {
        const lists = await Promise.all([
          MediaService.listFiles('uploads').catch(() => []),
          MediaService.listFiles('recordings').catch(() => []),
        ]);
        const all = (lists.flat() as any[]);
        const vids = all.filter(f => /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(f.name));
        vids.sort((a: any, b: any) => {
          const ad = (a.updated_at || a.created_at || '');
          const bd = (b.updated_at || b.created_at || '');
          return bd.localeCompare(ad);
        });
        const mapped = vids.slice(0, 24).map((f: any) => ({
          id: `media-${f.path}`,
          title: f.name,
          url: MediaService.getPublicUrl(f.path),
          createdAt: (f.updated_at || f.created_at || new Date().toISOString()),
          path: f.path,
        }));
        setStorageVideos(mapped);
      } catch (e) {
        console.error('Failed to load videos from storage:', e);
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

  const handleSelectVideo = (message: any) => {
    const videoUrl = message.cipherBlobUrl || message.videoRecording;
    if (videoUrl) {
      onSelectVideo(videoUrl, message.title);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Existing Video</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {videoMessages.length === 0 && storageVideos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No videos found. Record a video first to select from existing recordings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Storage Media Videos */}
              {storageVideos.map((video) => {
                const videoUrl = video.url;
                const deliveryStatus = { status: 'MEDIA', color: 'bg-purple-100 text-purple-800', icon: Play };
                const StatusIcon = deliveryStatus.icon;
                
                return (
                  <Card 
                    key={video.id} 
                    className={`cursor-pointer hover:shadow-md transition-shadow group ${selectedId === video.id ? 'ring-2 ring-white/80' : ''}`}
                    onClick={() => {
                      setSelectedId(video.id);
                      setSelectedItem({ url: video.url, title: video.title });
                    }}
                    onDoubleClick={() => {
                      onSelectVideo(video.url, video.title);
                      onOpenChange(false);
                    }}
                  >
                    <CardContent className="p-0">
                      <div className="relative aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg overflow-hidden">
                        <div className="w-full h-full relative">
                          {/* Video thumbnail background */}
                          <video
                            className="w-full h-full object-cover opacity-80"
                            src={videoUrl}
                            preload="metadata"
                            muted
                            controls={false}
                            style={{ pointerEvents: 'none' }}
                          />
                          {/* YouTube-style play button overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors">
                              <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
                            </div>
                          </div>
                          {/* YouTube-style duration badge (placeholder) */}
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                            0:00
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
                      
                      {/* Video info */}
                      <div className="p-3">
                        <h3 className="font-medium text-sm text-foreground truncate" title={formatDisplayName(video.title)}>
                          {formatDisplayName(video.title)}
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
              {videoMessages.map((message) => {
                const videoUrl = message.cipherBlobUrl;
                const deliveryStatus = getDeliveryStatus(message);
                const StatusIcon = deliveryStatus.icon;
                
                return (
                  <Card 
                    key={message.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow group"
                    onClick={() => handleSelectVideo(message)}
                  >
                    <CardContent className="p-0">
                      <div className="relative aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg overflow-hidden">
                        <div className="w-full h-full relative">
                          {/* Video thumbnail background */}
                          <video
                            className="w-full h-full object-cover opacity-80"
                            src={videoUrl}
                            preload="metadata"
                            muted
                            controls={false}
                            style={{ pointerEvents: 'none' }}
                          />
                          {/* YouTube-style play button overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors">
                              <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
                            </div>
                          </div>
                          {/* YouTube-style duration badge (placeholder) */}
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                            0:00
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
        
        <div className="flex justify-between space-x-2 pt-4 border-t">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={!selectedItem} onClick={() => { if (selectedItem) { onSelectVideo(selectedItem.url, selectedItem.title); onOpenChange(false); } }}>Use Selected</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
