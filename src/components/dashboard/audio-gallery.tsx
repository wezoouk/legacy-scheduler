import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Calendar, User, Send, Clock, Shield, CheckCircle, AlertCircle, Trash2, Edit, Mic, Square, Folder, File as FileIcon, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMessages } from '@/lib/use-messages';
import { useRecipients } from '@/lib/use-recipients';
import { AudioPreviewDialog } from './audio-preview-dialog';
import { format, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { MediaService } from '@/lib/media-service';
import { Link } from 'react-router-dom';

interface AudioGalleryProps {
  className?: string;
}

export function AudioGallery({ className }: AudioGalleryProps) {
  const { messages, deleteMessage, createMessage } = useMessages();
  const { recipients } = useRecipients();
  const [audioMessages, setAudioMessages] = useState<any[]>([]);
  const showExistingMessages = false; // Render only media-library items to avoid duplicates
  const [previewingAudio, setPreviewingAudio] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string>('');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  const [isNamingDialogOpen, setIsNamingDialogOpen] = useState(false);
  const [pendingRecording, setPendingRecording] = useState<Blob | null>(null);
  const [placeholderAudios, setPlaceholderAudios] = useState<any[]>([]);
  const [isRenamingDialogOpen, setIsRenamingDialogOpen] = useState(false);
  const [renamingAudio, setRenamingAudio] = useState<any>(null);
  const [newAudioName, setNewAudioName] = useState('');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [latestFiles, setLatestFiles] = useState<Array<{ name: string; path: string; url: string }>>([]);

  useEffect(() => {
    // Include messages that contain audio content or are marked VOICE
    const audios = messages.filter(message => 
      message.audioRecording ||
      message.types?.includes('VOICE') || 
      message.type === 'VOICE'
    );
    setAudioMessages(audios);

    // Load gallery audios from localStorage
    const savedGalleryAudios = localStorage.getItem('gallery-audios');
    if (savedGalleryAudios) {
      try {
        const parsed = JSON.parse(savedGalleryAudios);
        setPlaceholderAudios(parsed);
      } catch (error) {
        console.error('Error loading gallery audios:', error);
      }
    }
  }, [messages]);

  // Load latest 4 audios from storage
  useEffect(() => {
    const loadLatest = async () => {
      try {
        const lists = await Promise.all([
          MediaService.listFiles('uploads').catch(() => []),
          MediaService.listFiles('audio').catch(() => []),
          MediaService.listFiles('voice').catch(() => []),
          MediaService.listFiles('recordings').catch(() => []),
        ]);
        const all = (lists.flat() as any[]);
        const auds = all.filter(f => /\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(f.name));
        auds.sort((a: any, b: any) => {
          const ad = (a.updated_at || a.created_at || '');
          const bd = (b.updated_at || b.created_at || '');
          return bd.localeCompare(ad);
        });
        const latest = auds.slice(0, 4).map((f: any) => ({
          id: `media-${f.path}`,
          title: f.name,
          cipherBlobUrl: MediaService.getPublicUrl(f.path),
          createdAt: (f.updated_at || f.created_at || new Date().toISOString()),
          isGalleryItem: true,
        }));
        setPlaceholderAudios(latest);
      } catch (e) {
        console.error('Failed to load latest audios:', e);
      }
    };
    loadLatest();

    // Listen for freshly uploaded audio and prepend
    const onUploaded = (e: any) => {
      const d = e?.detail;
      if (!d || d.kind !== 'audio') return;
      const item = {
        id: `media-${d.path}`,
        title: d.title || d.path?.split('/')?.pop() || 'Audio',
        cipherBlobUrl: d.url,
        createdAt: d.createdAt || new Date().toISOString(),
        isGalleryItem: true,
        path: d.path,
      } as any;
      setPlaceholderAudios(prev => [item, ...prev].slice(0, Math.max(prev.length, 4)));
    };
    window.addEventListener('mediaUploaded', onUploaded as any);
    return () => window.removeEventListener('mediaUploaded', onUploaded as any);
  }, []);

  // Load latest image/other files for Files area
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const list = await MediaService.listFiles('uploads').catch(() => []);
        const filtered = (list as any[]).filter((f: any) => {
          const n = f.name.toLowerCase();
          const isAudio = /\.(mp3|wav|ogg|m4a|aac|webm)$/.test(n);
          const isVideo = /\.(mp4|webm|mov|m4v|avi|mkv)$/.test(n);
          return !isAudio && !isVideo;
        });
        filtered.sort((a: any, b: any) => {
          const ad = (a.updated_at || a.created_at || '');
          const bd = (b.updated_at || b.created_at || '');
          return bd.localeCompare(ad);
        });
        setLatestFiles(filtered.slice(0, 4).map((f: any) => ({
          name: f.name,
          path: f.path,
          url: MediaService.getPublicUrl(f.path),
        })));
      } catch (e) {
        console.error('Failed to load latest files:', e);
      }
    };
    loadFiles();
  }, []);

  const onUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      for (const file of Array.from(e.target.files)) {
        await MediaService.uploadAttachment(file);
      }
      // refresh both lists
      const list = await MediaService.listFiles('uploads').catch(() => []);
      const filtered = (list as any[]).filter((f: any) => {
        const n = f.name.toLowerCase();
        const isAudio = /\.(mp3|wav|ogg|m4a|aac|webm)$/.test(n);
        const isVideo = /\.(mp4|webm|mov|m4v|avi|mkv)$/.test(n);
        return !isAudio && !isVideo;
      });
      filtered.sort((a: any, b: any) => ( (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '') ));
      setLatestFiles(filtered.slice(0, 4).map((f: any) => ({ name: f.name, path: f.path, url: MediaService.getPublicUrl(f.path) })));
    } catch (err) {
      console.error('Upload files failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Upload failed: ${msg}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

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

  const getUsageSummaryForAudioUrl = (url: string) => {
    if (!url) return 'Ready for use';
    const usedIn = messages.filter((m: any) => m.audioRecording === url || m.cipherBlobUrl === url);
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

  const getUsageDetailForAudioUrl = (url: string) => {
    if (!url) return '';
    const usedIn = messages.filter((m: any) => m.audioRecording === url || m.cipherBlobUrl === url);
    if (usedIn.length === 0) return '';
    const details = usedIn.slice(0, 3).map((m: any) => `${m.title} → ${getRecipientNames(m)} (${m.status})`).join('\n');
    const more = usedIn.length > 3 ? `\n…and ${usedIn.length - 3} more` : '';
    return `Used in messages:\n${details}${more}`;
  };

  const getUsageLinesForAudioUrl = (url: string) => {
    if (!url) return [] as string[];
    const usedIn = messages.filter((m: any) => m.audioRecording === url || m.cipherBlobUrl === url);
    return usedIn.slice(0, 3).map((m: any) => `${m.title} → ${getRecipientNames(m)} (${m.status})`);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting audio recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
    }
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
      const audioResult = await MediaService.uploadAudio(pendingRecording, 'audio.webm');
      console.log('Audio uploaded to Supabase Storage:', audioResult.url);

      // Create an audio object for the gallery (not a message)
      const newAudio = {
        id: `gallery-audio-${Date.now()}`,
        title: name || `Audio Recording - ${new Date().toLocaleString()}`,
        content: 'Audio recording from gallery',
        types: ['VOICE'],
        recipients: [],
        status: 'DRAFT',
        cipherBlobUrl: audioResult.url, // Use Supabase Storage URL
        createdAt: new Date().toISOString(),
        isGalleryItem: true // Mark as gallery item, not a message
      };

      // Add to placeholder audios array (these show in the empty boxes)
      setPlaceholderAudios(prev => [...prev, newAudio]);

      // Clear the recording after saving
      setRecordedBlob(null);
      setRecordingUrl('');
      setPendingRecording(null);
      setIsNamingDialogOpen(false);

      // Show success message
      alert('Audio recording saved to gallery!');
    } catch (error) {
      console.error('Error saving recording:', error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`Failed to save audio recording: ${msg}\n\nPlease check your Supabase configuration.`);
    }
  };

  const deleteRecording = () => {
    setRecordedBlob(null);
    setRecordingUrl('');
  };

  const startRename = (audio: any) => {
    setRenamingAudio(audio);
    setNewAudioName(audio.title);
    setIsRenamingDialogOpen(true);
  };

  const confirmRename = () => {
    if (renamingAudio && newAudioName.trim()) {
      setPlaceholderAudios(prev => 
        prev.map(audio => 
          audio.id === renamingAudio.id 
            ? { ...audio, title: newAudioName.trim() }
            : audio
        )
      );
      setIsRenamingDialogOpen(false);
      setRenamingAudio(null);
      setNewAudioName('');
    }
  };

  const cancelRename = () => {
    setIsRenamingDialogOpen(false);
    setRenamingAudio(null);
    setNewAudioName('');
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">Audio Messages</h3>
        <p className="text-sm text-muted-foreground">
          Your recorded audio messages and voice notes
        </p>
      </div>
      
      <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
        {/* Record New Audio Card 1 */}
        <div className="space-y-3 min-w-[200px] w-[200px] shrink-0 snap-start">
          <Card 
            className="aspect-video overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-2 border-dashed border-green-500/50 hover:border-green-500"
            onClick={() => {
              console.log('Record audio button 1 clicked, isRecording:', isRecording, 'recordedBlob:', !!recordedBlob);
              if (!isRecording && !recordedBlob) {
                console.log('Starting audio recording...');
                startRecording();
              }
            }}
          >
            <CardContent className="p-0 h-full relative">
              {isRecording ? (
                <div className="w-full h-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                  {/* Audio waveform visualization */}
                  <div className="flex items-center space-x-1">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-white/30 rounded-sm animate-pulse"
                        style={{
                          width: '3px',
                          height: `${Math.random() * 40 + 20}px`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                  {/* Recording indicator */}
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                    REC
                  </div>
                </div>
              ) : recordedBlob ? (
                <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                  <Volume2 className="w-12 h-12 text-white" />
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-green-500/20 to-green-500/40 flex flex-col items-center justify-center">
                  <Mic className="w-12 h-12 text-green-500 mb-2" />
                  <span className="text-green-500 font-medium text-sm">Click to Record</span>
                </div>
              )}
              
              {/* Action overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-white/20">
                  {isRecording ? (
                    <Square className="w-8 h-8 text-white fill-white" />
                  ) : (
                    <Mic className="w-8 h-8 text-white fill-white" />
                  )}
                </div>
              </div>
              
              {/* Recording controls */}
              {isRecording && (
                <div className="absolute bottom-2 left-2 right-2 bg-gradient-to-t from-black/80 to-transparent p-2 rounded">
                  <div className="flex items-center justify-center space-x-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        stopRecording();
                      }}
                      className="h-8"
                    >
                      <Square className="w-3 h-3 mr-1" />
                      Stop
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Save/Delete controls for recorded audio */}
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
              {isRecording ? 'Recording...' : recordedBlob ? 'New Recording' : 'Record New Audio'}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {isRecording ? 'Click stop to finish' : recordedBlob ? 'Click save to create message' : 'Click to start recording'}
            </p>
          </div>
        </div>

        {/* Placeholder squares - show saved audio or empty boxes */}
        {Array.from({ length: Math.max(placeholderAudios.length, 4) }).map((_, index) => {
          const savedAudio = placeholderAudios[index];
          
          if (savedAudio) {
            // Show saved audio
            return (
              <div key={`placeholder-${index}`} className="space-y-3 min-w-[160px] w-[160px] shrink-0 snap-start">
                <Card 
                  className="aspect-video overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => {
                    console.log('Saved audio clicked:', savedAudio.title);
                    setPreviewingAudio(savedAudio);
                  }}
                >
                  <CardContent className="p-0 h-full relative">
                    <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                      {/* Audio waveform visualization */}
                      <div className="flex items-center space-x-1">
                        {[...Array(20)].map((_, i) => (
                          <div
                            key={i}
                            className="bg-white/30 rounded-sm transition-all duration-300 group-hover:bg-white/50"
                            style={{
                              width: '2px',
                              height: `${Math.random() * 32 + 16}px`,
                              animationDelay: `${i * 0.1}s`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Audio icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-white/20">
                        <Volume2 className="w-8 h-8 text-white fill-white" />
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
                          startRename(savedAudio);
                        }}
                        title="Rename audio"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 bg-red-500/90 hover:bg-red-600 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${savedAudio.title}"?`)) {
                            setPlaceholderAudios(prev => prev.filter((_, i) => i !== index));
                          }
                        }}
                        title="Delete audio"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Date overlay */}
                    <div className="absolute bottom-2 left-2 right-2 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b">
                      <div className="flex items-center text-white text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(savedAudio.createdAt), 'MMM d, HH:mm')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Audio info below thumbnail */}
                <div className="space-y-1">
                  <h3 className="font-medium text-sm text-foreground truncate" title={savedAudio.title}>
                    {savedAudio.title}
                  </h3>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground truncate" title={getUsageDetailForAudioUrl(savedAudio.cipherBlobUrl)}>
                      {getUsageSummaryForAudioUrl(savedAudio.cipherBlobUrl)}
                    </p>
                    {getUsageLinesForAudioUrl(savedAudio.cipherBlobUrl).map((line, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground truncate">{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            );
          } else {
            // Show empty placeholder
            return (
              <div key={`placeholder-${index}`} className="space-y-3 min-w-[160px] w-[160px] shrink-0 snap-start">
                <Card className="aspect-video bg-muted/50 border-dashed border-muted-foreground/30">
                  <CardContent className="flex items-center justify-center h-full p-2">
                    <div className="text-center text-muted-foreground">
                      <div className="w-7 h-7 mx-auto mb-2 bg-muted rounded flex items-center justify-center">
                        <Volume2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs">Empty</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Placeholder title */}
                <div className="space-y-1">
                  <h3 className="font-medium text-sm text-muted-foreground truncate">
                    Audio {index + 1}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    Ready for recording
                  </p>
                </div>
              </div>
            );
          }
        })}

        {/* Link tile to Media Library */}
        <div className="space-y-3 min-w-[160px] w-[160px] shrink-0 snap-start">
          <Link to="/dashboard/media">
            <Card className="aspect-video overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
              <CardContent className="p-0 h-full relative">
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-white">
                    <Folder className="w-5 h-5" />
                    <span className="text-xs font-medium">Open Media Library</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <div className="space-y-1">
            <h3 className="font-medium text-sm text-foreground truncate">See all media</h3>
            <p className="text-xs text-muted-foreground truncate">Browse and manage files</p>
          </div>
        </div>
      </div>
      
      {/* Files (images/other) row */}
      <div className="mt-8 pt-4 border-t border-gray-800 block w-full clear-both">
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-foreground">Files</h3>
          <p className="text-xs text-muted-foreground">Latest uploads (images and documents)</p>
        </div>
        <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
          {/* Upload tile */}
          <div className="space-y-3 min-w-[160px] w-[160px] shrink-0 snap-start">
            <Card className="aspect-video overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-2 border-dashed border-green-500/50 hover:border-green-500"
              onClick={() => fileInputRef.current?.click()}>
              <CardContent className="p-0 h-full relative">
                <div className="w-full h-full bg-gradient-to-br from-green-500/20 to-green-500/40 flex flex-col items-center justify-center">
                  <Upload className="w-6 h-6 text-green-500 mb-2" />
                  <span className="text-green-500 text-sm font-medium">Upload Files</span>
                </div>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onUploadFiles} />
              </CardContent>
            </Card>
            <div className="space-y-1">
              <h3 className="font-medium text-sm text-foreground truncate">Upload Files</h3>
              <p className="text-xs text-muted-foreground truncate">Click to select files</p>
            </div>
          </div>

          {/* Latest files tiles with placeholders to 4 */}
          {Array.from({ length: Math.max(latestFiles.length, 4) }).map((_, index) => {
            const f = latestFiles[index];
            if (f) {
              const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f.name);
              return (
                <div key={`file-${index}`} className="space-y-3 min-w-[160px] w-[160px] shrink-0 snap-start">
                  <Card className="aspect-video overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => window.open(f.url, '_blank')}
                  >
                    <CardContent className="p-0 h-full relative">
                      <div className="w-full h-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center overflow-hidden">
                        {isImage ? (
                          <img src={f.url} alt={f.name} className="w-full h-full object-cover opacity-90" />
                        ) : (
                          <div className="flex flex-col items-center text-white">
                            <FileIcon className="w-6 h-6 mb-2" />
                            <span className="text-[11px] px-2 truncate max-w-[140px]">{f.name}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm text-foreground truncate" title={f.name}>
                      {f.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">{isImage ? 'Image' : 'File'}</p>
                  </div>
                </div>
              );
            }
            // Empty placeholder tile matching audio style
            return (
              <div key={`file-ph-${index}`} className="space-y-3 min-w-[160px] w-[160px] shrink-0 snap-start">
                <Card className="aspect-video bg-muted/50 border-dashed border-muted-foreground/30">
                  <CardContent className="flex items-center justify-center h-full p-2">
                    <div className="text-center text-muted-foreground">
                      <div className="w-7 h-7 mx-auto mb-2 bg-muted rounded flex items-center justify-center">
                        <FileIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs">Empty</span>
                    </div>
                  </CardContent>
                </Card>
                <div className="space-y-1">
                  <h3 className="font-medium text-sm text-muted-foreground truncate">File {index + 1}</h3>
                  <p className="text-xs text-muted-foreground truncate">Ready to upload</p>
                </div>
              </div>
            );
          })}
        </div>
        image.png      </div>

      {/* Audio Preview Dialog */}
      {previewingAudio && (
        <AudioPreviewDialog
          open={!!previewingAudio}
          onOpenChange={() => setPreviewingAudio(null)}
          message={previewingAudio}
        />
      )}

      {/* Audio Naming Dialog */}
      {isNamingDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Name Your Audio</h3>
            <input
              type="text"
              placeholder="Enter audio name..."
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
                Save Audio
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

      {/* Audio Rename Dialog */}
      {isRenamingDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Rename Audio</h3>
            <input
              type="text"
              value={newAudioName}
              onChange={(e) => setNewAudioName(e.target.value)}
              placeholder="Enter new audio name..."
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
                disabled={!newAudioName.trim()}
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