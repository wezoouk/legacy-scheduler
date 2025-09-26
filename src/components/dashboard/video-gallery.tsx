import React, { useState, useEffect, useRef } from 'react';
import { Play, Calendar, User, Send, Clock, Shield, CheckCircle, AlertCircle, Trash2, Edit, Video, Square } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMessages } from '@/lib/use-messages';
import { useRecipients } from '@/lib/use-recipients';
import { VideoPreviewDialog } from './video-preview-dialog';
import { format, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { MediaService } from '@/lib/media-service';

interface VideoGalleryProps {
  className?: string;
}

export function VideoGallery({ className }: VideoGalleryProps) {
  const { messages, deleteMessage, createMessage } = useMessages();
  const { recipients } = useRecipients();
  const [videoMessages, setVideoMessages] = useState<any[]>([]);
  const showExistingMessages = true; // Show thumbnails; carousel will keep layout clean
  const [previewingVideo, setPreviewingVideo] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string>('');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  
  const [isNamingDialogOpen, setIsNamingDialogOpen] = useState(false);
  const [pendingRecording, setPendingRecording] = useState<Blob | null>(null);
  const [placeholderVideos, setPlaceholderVideos] = useState<any[]>([]);
  const [isRenamingDialogOpen, setIsRenamingDialogOpen] = useState(false);
  const [renamingVideo, setRenamingVideo] = useState<any>(null);
  const [newVideoName, setNewVideoName] = useState('');
  
  const cardVideoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // Include any message that has video content or is marked VIDEO
    const videos = messages.filter(message => 
      message.videoRecording || message.cipherBlobUrl ||
      message.types?.includes('VIDEO') || message.type === 'VIDEO'
    );
    setVideoMessages(videos);

    // Load gallery videos from localStorage
    const savedGalleryVideos = localStorage.getItem('gallery-videos');
    if (savedGalleryVideos) {
      try {
        const parsed = JSON.parse(savedGalleryVideos);
        setPlaceholderVideos(parsed);
      } catch (error) {
        console.error('Error loading gallery videos:', error);
      }
    }
  }, [messages]);

  // Save gallery videos to localStorage when they change
  useEffect(() => {
    if (placeholderVideos.length > 0) {
      localStorage.setItem('gallery-videos', JSON.stringify(placeholderVideos));
    }
  }, [placeholderVideos]);

  const getDeliveryStatus = (message: any) => {
    if (message.status === 'SENT') {
      return { status: 'SENT', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    } else if (message.status === 'SCHEDULED') {
      return { status: 'SCHEDULED', color: 'bg-blue-100 text-blue-800', icon: Clock };
    } else if (message.status === 'DRAFT') {
      return { status: 'DRAFT', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    } else {
      return { status: 'FAILED', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    }
  };

  const getDMSCountdown = (message: any) => {
    if (message.scope !== 'DMS' || !message.dmsConfig) return null;
    
    const now = new Date();
    const lastCheckIn = message.dmsConfig.lastCheckIn ? new Date(message.dmsConfig.lastCheckIn) : new Date(message.createdAt);
    const checkInInterval = message.dmsConfig.checkInInterval || 24; // hours
    const nextCheckIn = new Date(lastCheckIn.getTime() + (checkInInterval * 60 * 60 * 1000));
    
    if (now >= nextCheckIn) {
      const overdueHours = Math.floor((now.getTime() - nextCheckIn.getTime()) / (1000 * 60 * 60));
      return { overdue: true, hours: overdueHours };
    } else {
      const remainingHours = Math.floor((nextCheckIn.getTime() - now.getTime()) / (1000 * 60 * 60));
      return { overdue: false, hours: remainingHours };
    }
  };

  const getRecipientNames = (message: any) => {
    if (!message.recipientIds || message.recipientIds.length === 0) return 'No recipients';
    
    const messageRecipients = recipients.filter(recipient => 
      message.recipientIds.includes(recipient.id)
    );
    
    if (messageRecipients.length === 0) return `${message.recipientIds.length} recipient(s)`;
    
    if (messageRecipients.length === 1) {
      return messageRecipients[0].name;
    } else if (messageRecipients.length === 2) {
      return `${messageRecipients[0].name}, ${messageRecipients[1].name}`;
    } else {
      return `${messageRecipients[0].name} +${messageRecipients.length - 1} more`;
    }
  };

  const getUsageSummaryForUrl = (url: string) => {
    if (!url) return 'Ready for use';
    const usedIn = messages.filter((m: any) => m.cipherBlobUrl === url || m.videoRecording === url);
    if (usedIn.length === 0) return 'Ready for use';
    const scheduled = usedIn.filter((m: any) => m.status === 'SCHEDULED').length;
    const sent = usedIn.filter((m: any) => m.status === 'SENT').length;
    const draft = usedIn.filter((m: any) => m.status === 'DRAFT').length;
    const parts: string[] = [];
    if (scheduled) parts.push(`${scheduled} Scheduled`);
    if (sent) parts.push(`${sent} Sent`);
    if (draft) parts.push(`${draft} Draft`);
    const head = `Used in ${usedIn.length} message${usedIn.length > 1 ? 's' : ''}`;
    return parts.length ? `${head} • ${parts.join(' • ')}` : head;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setVideoStream(stream);
      
      if (cardVideoRef.current) {
        (cardVideoRef.current as any).srcObject = stream;
        (cardVideoRef.current as any).play?.().catch(() => {});
      }
      if (modalVideoRef.current) {
        (modalVideoRef.current as any).srcObject = stream;
        (modalVideoRef.current as any).play?.().catch(() => {});
      }

      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        stream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting video recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
      // Clear video elements
      if (cardVideoRef.current) {
        (cardVideoRef.current as any).srcObject = null;
      }
      if (modalVideoRef.current) {
        (modalVideoRef.current as any).srcObject = null;
      }
    }
  };

  const openPreviewModal = () => setIsPreviewModalOpen(true);
  const closePreviewModal = () => setIsPreviewModalOpen(false);

  // Keep modal video bound to current stream whenever modal opens or stream changes
  useEffect(() => {
    const bind = async () => {
      if (!isPreviewModalOpen) {
        // Cleanup any preview-only stream when modal closes
        if (previewStream) {
          previewStream.getTracks().forEach(t => t.stop());
          setPreviewStream(null);
        }
        if (modalVideoRef.current) {
          (modalVideoRef.current as any).srcObject = null;
        }
        return;
      }

      // If we already have the recording stream, reuse it
      if (videoStream && modalVideoRef.current) {
        try {
          (modalVideoRef.current as any).srcObject = videoStream;
          (modalVideoRef.current as any).play?.().catch(() => {});
          return;
        } catch (e) {
          console.error('Failed to bind recording stream to modal video:', e);
        }
      }

      // Otherwise request a lightweight preview stream just for the modal
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setPreviewStream(stream);
        if (modalVideoRef.current) {
          (modalVideoRef.current as any).srcObject = stream;
          (modalVideoRef.current as any).play?.().catch(() => {});
        }
      } catch (e) {
        console.error('Failed to open preview stream:', e);
      }
    };

    bind();
    // Cleanup on unmount
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isPreviewModalOpen, videoStream]);

  const getUsageDetailForUrl = (url: string) => {
    if (!url) return '';
    const usedIn = messages.filter((m: any) => m.cipherBlobUrl === url || m.videoRecording === url);
    if (usedIn.length === 0) return '';
    const details = usedIn.slice(0, 3).map((m: any) => `${m.title} → ${getRecipientNames(m)} (${m.status})`).join('\n');
    const more = usedIn.length > 3 ? `\n…and ${usedIn.length - 3} more` : '';
    return `Used in messages:\n${details}${more}`;
  };

  const getUsageLinesForUrl = (url: string) => {
    if (!url) return [] as string[];
    const usedIn = messages.filter((m: any) => m.cipherBlobUrl === url || m.videoRecording === url);
    return usedIn.slice(0, 3).map((m: any) => `${m.title} → ${getRecipientNames(m)} (${m.status})`);
  };

  const saveRecording = async () => {
    if (!recordedBlob) return;
    
    // Store the recording and open naming dialog
    setPendingRecording(recordedBlob);
    setIsNamingDialogOpen(true);
  };

  const saveRecordingWithName = async (name: string) => {
    if (!pendingRecording) return;

    try {
      // Upload to Supabase Storage - NO localStorage fallback
      const videoResult = await MediaService.uploadVideo(pendingRecording, 'video.webm');
      console.log('Video uploaded to Supabase Storage:', videoResult.url);

      // Create a video object for the gallery (not a message)
      const newVideo = {
        id: `gallery-video-${Date.now()}`,
        title: name || `Video Recording - ${new Date().toLocaleString()}`,
        content: 'Video recording from gallery',
        types: ['VIDEO'],
        recipients: [],
        status: 'DRAFT',
        cipherBlobUrl: videoResult.url, // Use Supabase Storage URL
        thumbnailUrl: videoResult.url,
        createdAt: new Date().toISOString(),
        isGalleryItem: true // Mark as gallery item, not a message
      };

      // Add to placeholder videos array (these show in the empty boxes)
      setPlaceholderVideos(prev => [...prev, newVideo]);

      // Clear the recording after saving
      setRecordedBlob(null);
      setRecordingUrl('');
      setPendingRecording(null);
      setIsNamingDialogOpen(false);
      if (cardVideoRef.current) {
        (cardVideoRef.current as any).srcObject = null;
      }
      if (modalVideoRef.current) {
        (modalVideoRef.current as any).srcObject = null;
      }

      // Show success message
      alert('Video recording saved to gallery!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error saving recording:', err);
      alert(`Failed to save video recording: ${msg}\n\nPlease check your Supabase configuration.`);
    }
  };

  const deleteRecording = () => {
    setRecordedBlob(null);
    setRecordingUrl('');
    if (cardVideoRef.current) {
      (cardVideoRef.current as any).srcObject = null;
    }
    if (modalVideoRef.current) {
      (modalVideoRef.current as any).srcObject = null;
    }
  };

  const startRename = (video: any) => {
    setRenamingVideo(video);
    setNewVideoName(video.title);
    setIsRenamingDialogOpen(true);
  };

  const confirmRename = () => {
    if (renamingVideo && newVideoName.trim()) {
      setPlaceholderVideos(prev => 
        prev.map(video => 
          video.id === renamingVideo.id 
            ? { ...video, title: newVideoName.trim() }
            : video
        )
      );
      setIsRenamingDialogOpen(false);
      setRenamingVideo(null);
      setNewVideoName('');
    }
  };

  const cancelRename = () => {
    setIsRenamingDialogOpen(false);
    setRenamingVideo(null);
    setNewVideoName('');
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">Video Messages</h3>
        <p className="text-sm text-muted-foreground">
          Your recorded video messages and shared videos
        </p>
      </div>
      
      <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory pb-2">
        {/* Record New Video Card 1 */}
        <div className="space-y-3 min-w-[200px] w-[200px] shrink-0 snap-start">
          <Card 
            className="aspect-video overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-2 border-dashed border-primary/50 hover:border-primary"
            onClick={() => { if (!isRecording && !recordedBlob) startRecording(); }}
          >
            <CardContent className="p-0 h-full relative">
              {/* Modal preview container handled below */}
              {/* Live preview always mounted; hidden when idle (card-level). When fullscreen is active, the ref is attached to the fullscreen video, not here. */}
              <video
                ref={cardVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
                style={{ display: (isRecording || videoStream) ? 'block' : 'none' }}
              />

              {/* Idle/recorded states */}
              {!(isRecording || videoStream) && (
                recordedBlob ? (
                  <video
                    src={recordingUrl}
                    className="w-full h-full object-cover"
                    controls={false}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex flex-col items-center justify-center" onClick={() => { if (!isRecording && !recordedBlob) startRecording(); }}>
                    <Video className="w-12 h-12 text-primary mb-2" />
                    <span className="text-primary font-medium text-sm">Click to Record</span>
                  </div>
                )
              )}
              
              {/* Action overlay - click to start/stop */}
              <div
                className={`absolute inset-0 flex items-center justify-center ${isRecording || videoStream ? 'cursor-pointer' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isRecording || videoStream) {
                    stopRecording();
                  } else if (!recordedBlob) {
                    startRecording();
                  }
                }}
              >
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-white/20">
                  {isRecording || videoStream ? (
                    <Square className="w-8 h-8 text-white fill-white" />
                  ) : (
                    <Video className="w-8 h-8 text-white fill-white" />
                  )}
                </div>
              </div>
              
              {/* Recording controls */}
              {(isRecording || videoStream) && (
                <div className="absolute bottom-2 left-2 right-2 bg-gradient-to-t from-black/80 to-transparent p-2 rounded">
                  {/* REC indicator */}
                  <div className="absolute -top-8 left-0 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold tracking-wider">REC</div>
                  <div className="flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); openPreviewModal(); }}
                      className="h-8"
                    >
                      Preview
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Save/Delete controls for recorded video */}
              {recordedBlob && !isRecording && (
                <div className="absolute bottom-2 left-2 right-2 bg-gradient-to-t from-black/80 to-transparent p-2 rounded">
                  <div className="flex items-center justify-center space-x-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={(e) => {
                        e.stopPropagation();
                        saveRecording();
                      }}
                      className="h-8"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRecording();
                      }}
                      className="h-8"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Card title */}
          <div className="space-y-1">
            <h3 className="font-medium text-sm text-foreground truncate">
              {isRecording ? 'Recording...' : recordedBlob ? 'New Recording' : 'Record New Video'}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {isRecording ? 'Click stop to finish' : recordedBlob ? 'Click save to create message' : 'Click to start recording'}
            </p>
          </div>
        </div>

        {/* Placeholder squares - show saved videos or empty boxes */}
        {Array.from({ length: Math.max(placeholderVideos.length, 4) }).map((_, index) => {
          const savedVideo = placeholderVideos[index];
          
          if (savedVideo) {
            // Show saved video
            return (
              <div key={`placeholder-${index}`} className="space-y-3 min-w-[200px] w-[200px] shrink-0 snap-start">
                <Card 
                  className="aspect-video overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => {
                    console.log('Saved video clicked:', savedVideo.title);
                    setPreviewingVideo(savedVideo);
                  }}
                >
                  <CardContent className="p-0 h-full relative">
                    <div className="w-full h-full relative bg-gradient-to-br from-blue-500 to-purple-600">
                      {/* Video thumbnail background */}
                      <video
                        className="w-full h-full object-cover opacity-80"
                        src={savedVideo.cipherBlobUrl}
                        preload="metadata"
                        muted
                        controls={false}
                        style={{ pointerEvents: 'none' }}
                      />
                      {/* YouTube-style play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors">
                          <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                        </div>
                      </div>
                      {/* YouTube-style duration badge (placeholder) */}
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        0:00
                      </div>
                    </div>
                    
                    {/* Status badge overlay */}
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-gray-100 text-gray-800 text-xs px-2 py-1">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        DRAFT
                      </Badge>
                    </div>
                    
                    {/* Action buttons overlay */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 bg-blue-500/90 hover:bg-blue-600 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(savedVideo);
                        }}
                        title="Rename video"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 bg-red-500/90 hover:bg-red-600 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${savedVideo.title}"?`)) {
                            setPlaceholderVideos(prev => prev.filter((_, i) => i !== index));
                          }
                        }}
                        title="Delete video"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Date overlay */}
                    <div className="absolute bottom-2 left-2 right-2 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b">
                      <div className="flex items-center text-white text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(savedVideo.createdAt), 'MMM d, HH:mm')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Video info below thumbnail */}
                <div className="space-y-1">
                  <h3 className="font-medium text-sm text-foreground truncate" title={savedVideo.title}>
                    {savedVideo.title}
                  </h3>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground truncate" title={getUsageDetailForUrl(savedVideo.cipherBlobUrl)}>
                      {getUsageSummaryForUrl(savedVideo.cipherBlobUrl)}
                    </p>
                    {getUsageLinesForUrl(savedVideo.cipherBlobUrl).map((line, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground truncate">{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            );
          } else {
            // Show empty placeholder
            return (
              <div key={`placeholder-${index}`} className="space-y-3 min-w-[200px] w-[200px] shrink-0 snap-start">
                <Card className="aspect-video bg-muted/50 border-dashed border-muted-foreground/30">
                  <CardContent className="flex items-center justify-center h-full p-2">
                    <div className="text-center text-muted-foreground">
                      <div className="w-8 h-8 mx-auto mb-2 bg-muted rounded flex items-center justify-center">
                        <Play className="w-4 h-4" />
                      </div>
                      <span className="text-xs">Empty</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Placeholder title */}
                <div className="space-y-1">
                  <h3 className="font-medium text-sm text-muted-foreground truncate">
                    Video {index + 1}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    Ready for recording
                  </p>
                </div>
              </div>
            );
          }
        })}

        {/* Existing video messages (hidden to avoid clutter) */}
        {showExistingMessages && videoMessages.map((message) => {
          const videoUrl = message.cipherBlobUrl || message.videoRecording;
          const deliveryStatus = getDeliveryStatus(message);
          const StatusIcon = deliveryStatus.icon;
          
          return (
            <div key={message.id} className="space-y-3 min-w-[200px] w-[200px] shrink-0 snap-start">
              <Card 
                className="aspect-video overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => {
                  console.log('Video thumbnail clicked:', message.title);
                  setPreviewingVideo(message);
                }}
              >
                <CardContent className="p-0 h-full relative">
                  {videoUrl ? (
                    <div className="w-full h-full relative bg-gradient-to-br from-blue-500 to-purple-600">
                      {/* Video thumbnail background */}
                      <video
                        className="w-full h-full object-cover opacity-80"
                        src={videoUrl}
                        preload="metadata"
                        muted
                        controls={false}
                        style={{ pointerEvents: 'none', height: '120px' }}
                      />
                      {/* YouTube-style play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors">
                          <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                        </div>
                      </div>
                      {/* YouTube-style duration badge (placeholder) */}
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        0:00
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                  )}
                  
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
                  
                  {/* Action buttons overlay */}
                  <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0 bg-white/90 hover:bg-white text-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Edit video clicked:', message.title);
                        // TODO: Open edit dialog
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0 bg-red-500/90 hover:bg-red-600 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete "${message.title}"?`)) {
                          deleteMessage(message.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Date overlay */}
                  <div className="absolute bottom-2 left-2 right-2 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b">
                    <div className="flex items-center text-white text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      {message.scheduledFor ? format(new Date(message.scheduledFor), 'MMM d, HH:mm') : 
                       message.sentAt ? format(new Date(message.sentAt), 'MMM d, HH:mm') :
                       format(new Date(message.createdAt), 'MMM d, HH:mm')}
                    </div>
                    
                    {/* DMS Countdown */}
                    {(() => {
                      const dmsCountdown = getDMSCountdown(message);
                      console.log('DMS check for message:', message.title, 'scope:', message.scope, 'dmsConfig:', message.dmsConfig, 'countdown:', dmsCountdown);
                      if (dmsCountdown) {
                        return (
                          <div className={`flex items-center text-xs mt-1 ${
                            dmsCountdown.overdue ? 'text-red-300 font-medium' : 'text-yellow-300'
                          }`}>
                            <Clock className="w-3 h-3 mr-1" />
                            {dmsCountdown.overdue ? 
                              `Overdue ${dmsCountdown.hours}h` : 
                              `${dmsCountdown.hours}h left`
                            }
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </CardContent>
              </Card>
              
              {/* Video info below thumbnail */}
              <div className="space-y-1">
                <h3 className="font-medium text-sm text-foreground truncate" title={message.title}>
                  {message.title}
                </h3>
                <p className="text-xs text-muted-foreground truncate" title={getRecipientNames(message)}>
                  <User className="w-3 h-3 inline mr-1" />
                  {getRecipientNames(message)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Video Preview Dialog */}
      {previewingVideo && (
        <VideoPreviewDialog
          open={!!previewingVideo}
          onOpenChange={() => setPreviewingVideo(null)}
          message={previewingVideo}
        />
      )}

      {/* Live Recording Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Recording Preview</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[70vh] bg-black flex items-center justify-center">
            <video
              ref={modalVideoRef}
              className="w-full h-full object-contain"
              autoPlay
              muted
              playsInline
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="destructive" onClick={() => { stopRecording(); closePreviewModal(); }}>Stop</Button>
            <Button variant="outline" onClick={closePreviewModal}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Naming Dialog */}
      {isNamingDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Name Your Video</h3>
            <input
              type="text"
              placeholder="Enter video name..."
              className="w-full p-2 border rounded mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  saveRecordingWithName(input.value);
                }
              }}
            />
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  const input = document.querySelector('input') as HTMLInputElement;
                  saveRecordingWithName(input.value);
                }}
                className="flex-1"
              >
                Save Video
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsNamingDialogOpen(false);
                  setPendingRecording(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Video Rename Dialog */}
      {isRenamingDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Rename Video</h3>
            <input
              type="text"
              value={newVideoName}
              onChange={(e) => setNewVideoName(e.target.value)}
              placeholder="Enter new video name..."
              className="w-full p-2 border rounded mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmRename();
                } else if (e.key === 'Escape') {
                  cancelRename();
                }
              }}
            />
            <div className="flex space-x-2">
              <Button
                onClick={confirmRename}
                className="flex-1"
                disabled={!newVideoName.trim()}
              >
                Rename
              </Button>
              <Button
                variant="outline"
                onClick={cancelRename}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}