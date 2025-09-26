import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CustomCalendar } from "@/components/ui/custom-calendar";
import { CustomTimePicker } from "@/components/ui/custom-time-picker";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useMessages } from "@/lib/use-messages";
import { useRecipients } from "@/lib/use-recipients";
import { MediaService } from "@/lib/media-service";
import { StorageStatus } from "@/components/dashboard/storage-status";
import { VideoSelectionDialog } from "@/components/dashboard/video-selection-dialog";
import { AudioSelectionDialog } from "@/components/dashboard/audio-selection-dialog";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { EmailTemplateSelector } from "@/components/dashboard/email-template-selector";
import { EmailPreviewDialog } from "@/components/dashboard/email-preview-dialog";
import { DmsActivationDialog } from "@/components/dashboard/dms-activation-dialog";
import { CreateRecipientDialog } from "@/components/dashboard/create-recipient-dialog";
import { type EmailTemplate } from "@/lib/email-templates";
import { 
  Mail, 
  Video, 
  Mic, 
  FileText, 
  Calendar as CalendarIcon, 
  Users,
  Shield,
  Play,
  Square,
  Upload,
  Trash2,
  Sparkles,
  Type,
  Eye,
  Plus,
  X
} from "lucide-react";

const messageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  types: z.array(z.enum(['EMAIL', 'VIDEO', 'VOICE', 'FILE'])).min(1, "At least one message type is required"),
  recipients: z.array(z.string()).min(1, "At least one recipient is required"),
  scheduledFor: z.string().optional(),
  isDmsProtected: z.boolean().optional().default(false),
});

type MessageForm = z.infer<typeof messageSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMessageDialog({ open, onOpenChange }: Props) {
  const [selectedTypes, setSelectedTypes] = useState<('EMAIL' | 'VIDEO' | 'VOICE' | 'FILE')[]>([]);
  const [isDmsProtected, setIsDmsProtected] = useState(false);
  const [showDmsActivation, setShowDmsActivation] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [useRichText, setUseRichText] = useState(false);
  const [isUsingTemplate, setIsUsingTemplate] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isVideoSelectionOpen, setIsVideoSelectionOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>('');
  const [isAudioSelectionOpen, setIsAudioSelectionOpen] = useState(false);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState<string | null>(null);
  const [selectedAudioTitle, setSelectedAudioTitle] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { createMessage } = useMessages();
  const { recipients, refreshRecipients } = useRecipients();
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      types: [],
      recipients: [],
      isDmsProtected: false,
    },
  });

  // Sync selectedTypes with form data
  useEffect(() => {
    setValue('types', selectedTypes);
  }, [selectedTypes, setValue]);

  // Sync DMS protection with form data
  useEffect(() => {
    setValue('isDmsProtected', isDmsProtected);
  }, [isDmsProtected, setValue]);

  // Sync rich text mode with form data
  useEffect(() => {
    if (selectedTypes.includes('EMAIL')) {
      setUseRichText(true);
    } else {
      setUseRichText(false);
    }
  }, [selectedTypes]);

  const selectedRecipients = watch('recipients') || [];

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }
    };
  }, [recordingUrl]);

  const startRecording = async () => {
    try {
      const constraints = selectedTypes.includes('VIDEO')
        ? { video: true, audio: true }
        : { audio: true };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (selectedTypes.includes('VIDEO') && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { 
          type: selectedTypes.includes('VIDEO') ? 'video/webm' : 'audio/webm' 
        });
        setRecordedBlob(blob);
        
        if (recordingUrl) {
          URL.revokeObjectURL(recordingUrl);
        }
        
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        
        if (selectedTypes.includes('VIDEO') && videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = url;
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    // Get selected recipient names from form data
    const selectedRecipientIds = watch('recipientIds') || [];
    const selectedRecipientNames = selectedRecipientIds
      .map(id => recipients.find(r => r.id === id)?.name)
      .filter(Boolean);
    
    // Use first recipient name, or generic placeholder if multiple/none selected
    const recipientName = selectedRecipientNames.length === 1 
      ? selectedRecipientNames[0]
      : selectedRecipientNames.length > 1 
        ? selectedRecipientNames[0] // Use first name for templates
        : '[Recipient Name]';
    
    // Process template content
    const processedSubject = template.subject
      .replace(/\[Name\]/g, recipientName || '')
      .replace(/\[Your Name\]/g, 'Your Name');
      
    const processedContent = template.content
      .replace(/\[Name\]/g, recipientName || '')
      .replace(/\[Your Name\]/g, 'Your Name');
    
    setValue('title', processedSubject);
    setValue('content', processedContent);
    
    // Force rich text mode for templates since they contain HTML
    setUseRichText(true);
    setIsUsingTemplate(true);
    setShowTemplates(false);
  };

  const onSubmit = async (data: MessageForm) => {
    try {
      console.log('=== MESSAGE CREATION START ===');
      console.log('Form data types:', data.types);
      console.log('Selected types (state):', selectedTypes);
      console.log('Selected video URL:', selectedVideoUrl);
      console.log('Selected audio URL:', selectedAudioUrl);
      console.log('Recorded blob:', !!recordedBlob);
      console.log('Form data:', data);
      
      // Validate that at least one type is selected
      if (selectedTypes.length === 0) {
        alert('Please select at least one message type (Email, Video, Voice, or File).');
        return;
      }
      
      let content = data.content;
      let videoUrl: string | null = null;
      let audioUrl: string | null = null;
      let videoData = null;
      let audioData = null;

      // Handle video recording - ONLY if VIDEO type is selected
      if (selectedTypes.includes('VIDEO')) {
        if (recordedBlob) {
          console.log('Processing recorded video blob');
          try {
            // Upload to Supabase Storage - NO FALLBACK
            const videoResult = await MediaService.uploadVideo(recordedBlob, 'video.webm');
            videoUrl = videoResult.url;
            content += `\n\n📹 Video Message: ${videoResult.url}`;
            console.log('Video uploaded to Supabase Storage:', videoResult.url);
          } catch (error) {
            console.error('Failed to upload video to Supabase Storage:', error);
            throw new Error(`Failed to upload video: ${error.message}`);
          }
        } else if (selectedVideoUrl) {
          console.log('Using selected existing video:', selectedVideoUrl);
          // Use selected existing video
          videoUrl = selectedVideoUrl;
          content += `\n\n📹 Video Message: ${selectedVideoUrl}`;
        } else {
          console.warn('VIDEO type selected but no video source found - recordedBlob:', !!recordedBlob, 'selectedVideoUrl:', selectedVideoUrl);
        }
      } else {
        console.log('VIDEO type not selected - skipping video processing');
      }

      // Handle audio recording - ONLY if VOICE type is selected
      if (selectedTypes.includes('VOICE')) {
        if (recordedBlob) {
          console.log('Processing recorded audio blob');
          try {
            // Upload to Supabase Storage - NO FALLBACK
            const audioResult = await MediaService.uploadAudio(recordedBlob, 'audio.webm');
            audioUrl = audioResult.url;
            content += `\n\n[Voice recording attached: ${audioResult.url}]`;
            console.log('Audio uploaded to Supabase Storage:', audioResult.url);
          } catch (error) {
            console.error('Failed to upload audio to Supabase Storage:', error);
            throw new Error(`Failed to upload audio: ${error.message}`);
          }
        } else if (selectedAudioUrl) {
          console.log('Using selected existing audio URL:', selectedAudioUrl);
          // Use selected existing audio
          audioUrl = selectedAudioUrl;
          content += `\n\n[Voice recording attached: ${selectedAudioUrl}]`;
        } else {
          console.warn('VOICE type selected but no audio source found - recordedBlob:', !!recordedBlob, 'selectedAudioUrl:', selectedAudioUrl);
        }
      } else {
        console.log('VOICE type not selected - skipping audio processing');
      }

      // Upload file attachments to storage and add links to content
      let uploadedAttachmentMeta: { name: string; size: number; type: string; url?: string }[] = [];
      if (selectedTypes.includes('FILE') && uploadedFiles.length > 0) {
        try {
          const uploads = await Promise.all(
            uploadedFiles.map(async (file) => {
              try {
                const result = await MediaService.uploadAttachment(file);
                return { name: file.name, size: file.size, type: file.type, url: result.url };
              } catch (e) {
                console.error('Failed to upload attachment:', file.name, e);
                return { name: file.name, size: file.size, type: file.type };
              }
            })
          );
          uploadedAttachmentMeta = uploads;
          const links = uploads.map(u => `${u.name}${u.url ? ` - ${u.url}` : ''}`).join('\n');
          content += `\n\nAttached files (links):\n${links}`;
        } catch (e) {
          console.error('Attachment upload error:', e);
          // Fallback to listing names only
          content += `\n\nAttached files: ${uploadedFiles.map(f => f.name).join(', ')}`;
          uploadedAttachmentMeta = uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }));
        }
      }
      
      const messageData = {
        title: data.title,
        content,
        types: selectedTypes, // Use selectedTypes state, not form data
        recipientIds: data.recipients,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
        status: data.scheduledFor ? 'SCHEDULED' : 'DRAFT',
        scope: data.isDmsProtected ? 'DMS' : 'NORMAL',
        // Only set cipherBlobUrl/thumbnail for VIDEO type; avoid mislabeling audio as video
        cipherBlobUrl: selectedTypes.includes('VIDEO') ? (videoUrl || undefined) : undefined,
        thumbnailUrl: selectedTypes.includes('VIDEO') ? (videoUrl || undefined) : undefined,
        // Persist media URLs explicitly for accurate previews and email building
        videoRecording: videoUrl || undefined,
        audioRecording: audioUrl || undefined,
        // NO localStorage fallback - only Supabase Storage URLs
        attachments: uploadedAttachmentMeta,
      };
      
      console.log('Creating message with data:', {
        ...messageData,
        cipherBlobUrl: messageData.cipherBlobUrl,
        videoUrl,
        audioUrl,
        selectedAudioUrl,
        selectedVideoUrl
      });
      
      await createMessage(messageData);
      
      // Don't close dialog, just reset form for next message
      resetFormState();
    } catch (err) {
      console.error('Failed to create message:', err);
    }
  };

  const onSubmitAndClose = async (data: MessageForm) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  const resetFormState = () => {
    reset();
    setRecordedBlob(null);
    setRecordingUrl(null);
    setUploadedFiles([]);
    setSelectedTypes([]);
    setIsDmsProtected(false);
    setUseRichText(false);
    setIsUsingTemplate(false);
    // Clear selected media URLs
    setSelectedVideoUrl(null);
    setSelectedVideoTitle('');
    setSelectedAudioUrl(null);
    setSelectedAudioTitle('');
  };

  const handleClose = () => {
    resetFormState();
    onOpenChange(false);
  };

  const toggleRecipient = (recipientId: string) => {
    const current = selectedRecipients;
    const updated = current.includes(recipientId)
      ? current.filter(id => id !== recipientId)
      : [...current, recipientId];
    setValue('recipients', updated);
  };

  const toggleMessageType = (type: 'EMAIL' | 'VIDEO' | 'VOICE' | 'FILE') => {
    const updated = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    
    if (updated.length > 0) {
      setSelectedTypes(updated);
      setValue('types', updated);
    }
  };

  const messageTypes = [
    { id: 'EMAIL', label: 'Email', icon: Mail, description: 'Send encrypted email message' },
    { id: 'VIDEO', label: 'Video', icon: Video, description: 'Record video message' },
    { id: 'VOICE', label: 'Voice', icon: Mic, description: 'Record audio message' },
    { id: 'FILE', label: 'File', icon: FileText, description: 'Attach documents or files' },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Create New Message</DialogTitle>
              <DialogDescription>
                Compose a message for future delivery or legacy release
              </DialogDescription>
            </div>
            <StorageStatus />
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Message Type Selection */}
          <div className="space-y-3">
            <Label>Message Types (select multiple)</Label>
            <div className="grid grid-cols-2 gap-3">
              {messageTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedTypes.includes(type.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      toggleMessageType(type.id);
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className="h-5 w-5 mt-0.5" />
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {type.description}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.types && (
              <p className="text-sm text-destructive">{errors.types.message}</p>
            )}
          </div>

          {/* Recording/Upload Section */}
          {selectedTypes.includes('VIDEO') && (
            <div className="space-y-3">
              <Label>Video Recording</Label>
              
              {/* Existing Videos Selection */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Select Existing Video</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsVideoSelectionOpen(true)}
                  >
                    Browse Videos
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose from previously recorded videos or record a new one below.
                </p>
              </div>
              
              <div className="border rounded-lg p-4">
                <video
                  ref={videoRef}
                  className="w-full max-h-64 bg-black rounded mb-3"
                  controls={!isRecording}
                  muted={isRecording}
                />
                <div className="flex space-x-2">
                  {!isRecording ? (
                    <Button type="button" onClick={startRecording} variant="outline">
                      <Video className="h-4 w-4 mr-2" />
                      Record New Video
                    </Button>
                  ) : (
                    <Button type="button" onClick={stopRecording} variant="destructive">
                      <Square className="h-4 w-4 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                  {recordedBlob && (
                    <Button type="button" variant="ghost" onClick={() => {
                      setRecordedBlob(null);
                      setRecordingUrl(null);
                    }}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedTypes.includes('VOICE') && (
            <div className="space-y-3">
              <Label>Voice Recording</Label>
              
              {/* Existing Audio Selection */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Select Existing Audio</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAudioSelectionOpen(true)}
                  >
                    Browse Audio
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose from previously recorded audio or record a new one below.
                </p>
              </div>
              
              <div className="border rounded-lg p-4">
                {(recordingUrl || selectedAudioUrl) && (
                  <audio src={recordingUrl || selectedAudioUrl || ''} controls className="w-full mb-3" />
                )}
                <div className="flex space-x-2">
                  {!isRecording ? (
                    <Button type="button" onClick={startRecording} variant="outline">
                      <Mic className="h-4 w-4 mr-2" />
                      Record New Audio
                    </Button>
                  ) : (
                    <Button type="button" onClick={stopRecording} variant="destructive">
                      <Square className="h-4 w-4 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                  {(recordedBlob || selectedAudioUrl) && (
                    <Button type="button" variant="ghost" onClick={() => {
                      setRecordedBlob(null);
                      setRecordingUrl(null);
                      setSelectedAudioUrl(null);
                      setSelectedAudioTitle('');
                    }}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedTypes.includes('FILE') && (
            <div className="space-y-3">
              <Label>File Attachments</Label>
              <div className="border rounded-lg p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-3"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
                
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DMS Protection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-red-600" />
                  Dead Man's Switch Protection
                </Label>
                <p className="text-sm text-muted-foreground">
                  This message will be automatically sent if you miss your regular check-ins
                </p>
              </div>
              <Switch
                checked={isDmsProtected}
                onCheckedChange={setIsDmsProtected}
              />
            </div>
            {isDmsProtected && (
              <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                <div className="flex items-center justify-between text-blue-300 mb-1">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    <span className="font-medium text-sm">DMS Protected Message</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDmsActivation(true)}
                    className="text-xs h-6 px-2 bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500 hover:border-yellow-600"
                  >
                    Configure DMS
                  </Button>
                </div>
                <p className="text-blue-400 text-xs">
                  This message will be sent automatically if you fail to check in according to your DMS configuration.
                </p>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter message title"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Content</Label>
              <div className="flex items-center space-x-2">
                {selectedTypes.includes('EMAIL') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplates(true)}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Templates
                  </Button>
                )}
                {selectedTypes.includes('EMAIL') && watch('content') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEmailPreview(true)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUseRichText(!useRichText);
                    if (useRichText) {
                      // If switching to plain text, we're no longer using template
                      setIsUsingTemplate(false);
                    }
                  }}
                  disabled={isUsingTemplate && useRichText}
                  title={isUsingTemplate && useRichText ? "Cannot switch to plain text when using HTML template" : ""}
                >
                  <Type className="w-3 h-3 mr-1" />
                  {useRichText ? 'Plain Text' : 'Rich Text'}
                </Button>
              </div>
            </div>
            
            {useRichText && selectedTypes.includes('EMAIL') ? (
              <RichTextEditor
                value={watch('content') || ''}
                onChange={(value) => setValue('content', value)}
                placeholder="Compose your beautiful email message..."
                className="min-h-[200px]"
              />
            ) : (
              <Textarea
                id="content"
                placeholder={
                  selectedTypes.includes('EMAIL') ? 'Compose your email message...' :
                  selectedTypes.includes('VIDEO') && selectedTypes.includes('VOICE') ? 'Add video and voice message notes...' :
                  selectedTypes.includes('VIDEO') ? 'Add video description or script...' :
                  selectedTypes.includes('VOICE') ? 'Add voice message notes...' :
                  'Add file description and notes...'
                }
                className="min-h-[100px]"
                {...register("content")}
              />
            )}
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
          </div>

          {/* Recipients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Recipients ({selectedRecipients.length} selected)
              </Label>
              <CreateRecipientDialog onRecipientAdded={refreshRecipients}>
                <Button type="button" variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recipient
                </Button>
              </CreateRecipientDialog>
            </div>
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
              {recipients.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    No recipients available.
                  </p>
                  <CreateRecipientDialog onRecipientAdded={refreshRecipients}>
                    <Button type="button" variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Recipient
                    </Button>
                  </CreateRecipientDialog>
                </div>
              ) : (
                <div className="space-y-3">
                  {recipients.map((recipient) => (
                    <div key={recipient.id} className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedRecipients.includes(recipient.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setValue('recipients', [...selectedRecipients, recipient.id]);
                          } else {
                            setValue('recipients', selectedRecipients.filter(id => id !== recipient.id));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{recipient.name}</div>
                        <div className="text-xs text-muted-foreground">{recipient.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.recipients && (
              <p className="text-sm text-destructive">{errors.recipients.message}</p>
            )}
          </div>

          {/* Schedule */}
          {!isDmsProtected && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="scheduledFor" className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Schedule Delivery (Optional)
                </Label>
                {watch("scheduledFor") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setValue("scheduledFor", undefined)}
                    className="text-xs h-6 px-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watch("scheduledFor") && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watch("scheduledFor") ? format(new Date(watch("scheduledFor")!), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-black">
                    <CustomCalendar
                      mode="single"
                      selected={watch("scheduledFor") ? new Date(watch("scheduledFor")!) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const currentTime = watch("scheduledFor") ? new Date(watch("scheduledFor")!) : new Date();
                          const combinedDateTime = new Date(date);
                          combinedDateTime.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
                          setValue("scheduledFor", combinedDateTime.toISOString());
                        }
                      }}
                      initialFocus
                      className="bg-black"
                    />
                    <div className="p-3 border-t border-gray-600 space-y-2 bg-gray-800">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                        onClick={() => {
                          const today = new Date();
                          const currentTime = watch("scheduledFor") ? new Date(watch("scheduledFor")!) : new Date();
                          today.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
                          setValue("scheduledFor", today.toISOString());
                        }}
                      >
                        Choose Today
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-gray-300 hover:text-red-400 hover:bg-gray-700"
                        onClick={() => setValue("scheduledFor", undefined)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Remove Date
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <CustomTimePicker
                  value={watch("scheduledFor") ? new Date(watch("scheduledFor")!).toTimeString().slice(0, 5) : ""}
                  onChange={(timeValue) => {
                    const currentDate = watch("scheduledFor") ? new Date(watch("scheduledFor")!) : new Date();
                    const [hours, minutes] = timeValue.split(':');
                    currentDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0);
                    setValue("scheduledFor", currentDate.toISOString());
                  }}
                  disabled={!watch("scheduledFor")}
                  placeholder="Select time"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to save as draft
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              disabled={isSubmitting}
              onClick={handleSubmit(onSubmit)}
            >
              {isSubmitting ? 'Creating...' : 'Save & Create Another'}
            </Button>
            <Button 
              type="button" 
              disabled={isSubmitting}
              onClick={handleSubmit(onSubmitAndClose)}
            >
              {isSubmitting ? 'Creating...' : 'Save & Close'}
            </Button>
          </div>
        </form>
        
        <EmailTemplateSelector
          open={showTemplates}
          onOpenChange={setShowTemplates}
          onSelectTemplate={handleTemplateSelect}
        />
        
        <EmailPreviewDialog
          open={showEmailPreview}
          onOpenChange={setShowEmailPreview}
          subject={watch('title') || 'Your Message Subject'}
          content={watch('content') || ''}
          recipientName={
            watch('recipientIds') && watch('recipientIds').length > 0
              ? recipients.find(r => r.id === watch('recipientIds')[0])?.name || "Recipient"
              : "Recipient"
          }
          senderName="Your Name"
        />
        
        <DmsActivationDialog
          open={showDmsActivation}
          onOpenChange={setShowDmsActivation}
          onActivate={(config) => {
            // Save DMS configuration to localStorage
            const dmsConfig = {
              id: `dms-${Date.now()}`,
              ...config,
              status: 'ACTIVE' as const,
              startDate: new Date(),
              endDate: new Date(Date.now() + config.durationDays * 24 * 60 * 60 * 1000),
            };
            localStorage.setItem('dms-config', JSON.stringify(dmsConfig));
            
            // Create initial cycle
            const nextCheckin = new Date(Date.now() + config.frequencyDays * 24 * 60 * 60 * 1000);
            const cycleData = {
              id: `cycle-${dmsConfig.id}`,
              nextCheckinAt: nextCheckin,
              state: 'ACTIVE' as const,
              reminders: [1, 3, 7],
            };
            localStorage.setItem('dms-cycle', JSON.stringify(cycleData));
            
            console.log('DMS activated with config:', dmsConfig);
          }}
        />
        
        <VideoSelectionDialog
          open={isVideoSelectionOpen}
          onOpenChange={setIsVideoSelectionOpen}
          onSelectVideo={(videoUrl, title) => {
            setSelectedVideoUrl(videoUrl);
            setSelectedVideoTitle(title);
            // Set the video in the video element
            if (videoRef.current) {
              videoRef.current.src = videoUrl;
            }
          }}
        />
        
        <AudioSelectionDialog
          open={isAudioSelectionOpen}
          onOpenChange={setIsAudioSelectionOpen}
          onSelectAudio={(audioUrl, title) => {
            console.log('Audio selected:', { audioUrl, title });
            setSelectedAudioUrl(audioUrl);
            setSelectedAudioTitle(title);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}