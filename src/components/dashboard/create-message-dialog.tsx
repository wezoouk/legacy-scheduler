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
import { FileSelectionDialog } from "@/components/dashboard/file-selection-dialog";
import { type EmailTemplate } from "@/lib/email-templates";
import { DmsService } from "@/lib/dms-service";
import { useAuth } from "@/lib/auth-context";
import { toast } from "../../../hooks/use-toast";
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
  X,
  CheckCircle2,
  AlertCircle
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
  const [useRichText, setUseRichText] = useState(true);
  const [isUsingTemplate, setIsUsingTemplate] = useState(false);
  const [templateBackgroundColor, setTemplateBackgroundColor] = useState<string>('#ffffff');
  const [originalTemplateContent, setOriginalTemplateContent] = useState<string>('');
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
  const [isFileSelectionOpen, setIsFileSelectionOpen] = useState(false);
  const { user } = useAuth();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isVideoRecordModalOpen, setIsVideoRecordModalOpen] = useState(false);
  const [isVideoNameDialogOpen, setIsVideoNameDialogOpen] = useState(false);
  const [videoNameInput, setVideoNameInput] = useState('');
  const [isAudioRecordModalOpen, setIsAudioRecordModalOpen] = useState(false);
  const [isAudioNameDialogOpen, setIsAudioNameDialogOpen] = useState(false);
  const [audioNameInput, setAudioNameInput] = useState('');
  const audioModalRef = useRef<HTMLAudioElement>(null);
  
  const startPreviewStream = async () => {
    try {
      if (streamRef.current) {
        if (modalVideoRef.current) {
          (modalVideoRef.current as any).srcObject = streamRef.current;
          (modalVideoRef.current as any).play?.().catch(() => {});
        }
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (modalVideoRef.current) {
        (modalVideoRef.current as any).srcObject = stream;
        (modalVideoRef.current as any).play?.().catch(() => {});
      }
    } catch (e) {
      console.error('Failed to open preview stream:', e);
    }
  };
  
  const { createMessage } = useMessages();
  const { recipients, refreshRecipients } = useRecipients();
  
  // Debug recipients loading
  useEffect(() => {
    console.log('=== RECIPIENTS LOADING DEBUG ===');
    console.log('recipients array:', recipients);
    console.log('recipients length:', recipients.length);
    console.log('recipients loaded:', recipients.length > 0);
    console.log('================================');
  }, [recipients]);
  
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
      // Reuse preview stream if available, else request a fresh one
      let stream = streamRef.current;
      if (!stream) {
        const constraints = selectedTypes.includes('VIDEO')
          ? { video: true, audio: true }
          : { audio: true };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
      }
      
      if (selectedTypes.includes('VIDEO')) {
        if (isVideoRecordModalOpen && modalVideoRef.current) {
          (modalVideoRef.current as any).srcObject = stream;
          (modalVideoRef.current as any).play?.().catch(() => {});
        } else if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
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
        
        if (selectedTypes.includes('VIDEO')) {
          if (isVideoRecordModalOpen && modalVideoRef.current) {
            (modalVideoRef.current as any).srcObject = null;
            modalVideoRef.current.src = url;
          } else if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = url;
          }
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  // Auto-start preview stream when the record modal opens
  useEffect(() => {
    if (isVideoRecordModalOpen) {
      startPreviewStream();
    }
  }, [isVideoRecordModalOpen]);

  // Bind recorded clip into modal player for review
  useEffect(() => {
    if (!isVideoRecordModalOpen || !recordingUrl || !modalVideoRef.current) return;
    try {
      (modalVideoRef.current as any).srcObject = null;
      modalVideoRef.current.src = recordingUrl;
      const el = modalVideoRef.current as HTMLVideoElement;
      const onLoaded = () => {
        try { el.currentTime = 0; el.pause(); } catch {}
      };
      el.addEventListener('loadedmetadata', onLoaded, { once: true } as any);
    } catch {}
  }, [recordingUrl, isVideoRecordModalOpen]);

  // Audio helpers
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(blob);
        if (recordingUrl) URL.revokeObjectURL(recordingUrl);
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        if (audioModalRef.current) {
          audioModalRef.current.src = url;
        }
      };
      recorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Failed to start audio recording:', e);
      alert('Could not access microphone. Please check permissions.');
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

  const handleTemplateSelect = (template: EmailTemplate, backgroundColor?: string) => {
    // Get selected recipient names from form data
    const selectedRecipientIds = watch('recipients') || [];
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
    
    console.log('📧 Template content before processing:', template.content);
    console.log('📧 Template content after processing:', processedContent);
    
    setValue('title', processedSubject);
    setValue('content', processedContent);
    
    // Store original template content for email sending
    setOriginalTemplateContent(template.content);
    
    // Store background color for email styling
    if (backgroundColor) {
      setTemplateBackgroundColor(backgroundColor);
    }
    
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
      console.log('Form content length:', data.content?.length || 0);
      console.log('Form content preview:', data.content?.substring(0, 100) || 'EMPTY');
      
      // Validate that at least one type is selected
      if (selectedTypes.length === 0) {
        alert('Please select at least one message type (Email, Video, Voice, or File).');
        return;
      }

      // Warn if no scheduled date is provided
      if (!data.scheduledFor) {
        const confirmed = confirm('⚠️ WARNING: No scheduled date provided.\n\nThis message will be saved as a DRAFT and will NOT be sent automatically.\n\nTo schedule the message for automatic sending, please select a date and time.\n\nDo you want to continue saving as a draft?');
        if (!confirmed) {
          return;
        }
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
            // Upload to Supabase Storage using message title as filename
            const baseTitle = (data.title || 'video')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '')
              .slice(0, 50);
            const filename = `${baseTitle}-${Date.now()}.webm`;
            const videoResult = await MediaService.uploadVideo(recordedBlob, filename);
            videoUrl = videoResult.url;
          // Create video viewer URL with parameters
        console.log('=== RECIPIENT DEBUG ===');
        console.log('data.recipients:', data.recipients);
        console.log('recipients:', recipients);
        console.log('First recipient ID:', data.recipients?.[0]);
        const foundRecipient = recipients.find(r => r.id === data.recipients?.[0]);
        console.log('Found recipient:', foundRecipient);
        const recipientName = foundRecipient?.name || 'Recipient';
        console.log('Final recipient name:', recipientName);
        console.log('========================');
          const videoViewerUrl = `${window.location.origin}/video-viewer?video=${encodeURIComponent(videoResult.url)}&sender=${encodeURIComponent(user?.user_metadata?.full_name || 'Rembr')}&title=${encodeURIComponent(data.title || 'Video Message')}&content=${encodeURIComponent(data.content || '')}&recipient=${encodeURIComponent(recipientName)}&sentAt=${encodeURIComponent(new Date().toISOString())}`;
          
          content += `
            <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 12px; border: 1px solid #e9ecef;">
              <div style="text-align: center; margin-bottom: 16px;">
                <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">📹 Video Message</h3>
                <p style="color: #6b7280; font-size: 14px; margin: 0;">From: ${user?.user_metadata?.full_name || 'Rembr'}</p>
              </div>
              <div style="text-align: center;">
                <a href="${videoViewerUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" target="_blank" rel="noopener noreferrer">
                  🎬 View Video Message
                </a>
              </div>
              <div style="text-align: center; margin-top: 12px;">
                <a href="${videoResult.url}" style="color: #6b7280; text-decoration: none; font-size: 14px;" target="_blank" rel="noopener noreferrer">
                  🔗 Open Video Directly
                </a>
              </div>
            </div>
          `;
            console.log('Video uploaded to Supabase Storage:', videoResult.url);

            // Notify galleries so the new video appears first immediately
            try {
              window.dispatchEvent(new CustomEvent('mediaUploaded', {
                detail: {
                  kind: 'video',
                  path: videoResult.path,
                  url: videoResult.url,
                  title: data.title || 'Video Recording',
                  createdAt: new Date().toISOString(),
                }
              }));
            } catch {}
          } catch (error) {
            console.error('Failed to upload video to Supabase Storage:', error);
            throw new Error(`Failed to upload video: ${error.message}`);
          }
        } else if (selectedVideoUrl) {
          console.log('Using selected existing video:', selectedVideoUrl);
          // Use selected existing video
          videoUrl = selectedVideoUrl;
          // Create video viewer URL with parameters
          console.log('=== RECIPIENT DEBUG (SELECTED VIDEO) ===');
          console.log('data.recipients:', data.recipients);
          console.log('recipients:', recipients);
          console.log('First recipient ID:', data.recipients?.[0]);
          const foundRecipient = recipients.find(r => r.id === data.recipients?.[0]);
          console.log('Found recipient:', foundRecipient);
          const recipientName = foundRecipient?.name || 'Recipient';
          console.log('Final recipient name:', recipientName);
          console.log('========================================');
          const videoViewerUrl = `${window.location.origin}/video-viewer?video=${encodeURIComponent(selectedVideoUrl)}&sender=${encodeURIComponent(user?.user_metadata?.full_name || 'Rembr')}&title=${encodeURIComponent(data.title || 'Video Message')}&content=${encodeURIComponent(data.content || '')}&recipient=${encodeURIComponent(recipientName)}&sentAt=${encodeURIComponent(new Date().toISOString())}`;
          
          content += `
            <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 12px; border: 1px solid #e9ecef;">
              <div style="text-align: center; margin-bottom: 16px;">
                <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">📹 Video Message</h3>
                <p style="color: #6b7280; font-size: 14px; margin: 0;">From: ${user?.user_metadata?.full_name || 'Rembr'}</p>
              </div>
              <div style="text-align: center;">
                <a href="${videoViewerUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" target="_blank" rel="noopener noreferrer">
                  🎬 View Video Message
                </a>
              </div>
              <div style="text-align: center; margin-top: 12px;">
                <a href="${selectedVideoUrl}" style="color: #6b7280; text-decoration: none; font-size: 14px;" target="_blank" rel="noopener noreferrer">
                  🔗 Open Video Directly
                </a>
              </div>
            </div>
          `;
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
            // Upload to Supabase Storage using message title as filename
            const baseTitle = (data.title || 'audio')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '')
              .slice(0, 50);
            const filename = `${baseTitle}-${Date.now()}.webm`;
            const audioResult = await MediaService.uploadAudio(recordedBlob, filename);
            audioUrl = audioResult.url;
          content += `\n\n🎤 Voice recording: <a href="${audioResult.url}" target="_blank" rel="noopener noreferrer">Listen</a>`;
            console.log('Audio uploaded to Supabase Storage:', audioResult.url);

            // Notify galleries so the new audio appears first immediately
            try {
              window.dispatchEvent(new CustomEvent('mediaUploaded', {
                detail: {
                  kind: 'audio',
                  path: audioResult.path,
                  url: audioResult.url,
                  title: data.title || 'Audio Recording',
                  createdAt: new Date().toISOString(),
                }
              }));
            } catch {}
          } catch (error) {
            console.error('Failed to upload audio to Supabase Storage:', error);
            throw new Error(`Failed to upload audio: ${error.message}`);
          }
        } else if (selectedAudioUrl) {
          console.log('Using selected existing audio URL:', selectedAudioUrl);
          // Use selected existing audio
          audioUrl = selectedAudioUrl;
          content += `\n\n🎤 Voice recording: <a href="${selectedAudioUrl}" target="_blank" rel="noopener noreferrer">Listen</a>`;
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
          const links = uploads.map(u => {
            if (!u.url) return u.name
            const safeName = u.name.replace(/[`]/g, '')
            return `<a href="${u.url}" target="_blank" rel="noopener noreferrer">${safeName}</a>`
          }).join('<br>');
          content += `\n\nAttached files (links):\n${links}`;
        } catch (e) {
          console.error('Attachment upload error:', e);
          // Fallback to listing names only
          content += `\n\nAttached files: ${uploadedFiles.map(f => f.name).join(', ')}`;
          uploadedAttachmentMeta = uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }));
        }
      }
      
      // Use the edited content from the rich text editor (includes user changes)
      let finalContent = content;
      
      console.log('📧 ===== CONTENT FLOW DEBUG =====');
      console.log('📧 Raw content from editor:', content);
      console.log('📧 Is using template:', isUsingTemplate);
      console.log('📧 Template background color:', templateBackgroundColor);
      
      // If using template, we still need to process recipient names in the edited content
      if (isUsingTemplate) {
        // Get selected recipient names for template processing
        const selectedRecipientIds = data.recipients || [];
        const selectedRecipientNames = selectedRecipientIds
          .map(id => recipients.find(r => r.id === id)?.name)
          .filter(Boolean);
        
        const recipientName = selectedRecipientNames.length === 1 
          ? selectedRecipientNames[0]
          : selectedRecipientNames.length > 1 
            ? selectedRecipientNames[0]
            : '[Recipient Name]';
        
        // Process the edited content with recipient names (preserves user formatting)
        finalContent = content
          .replace(/\[Name\]/g, recipientName || '')
          .replace(/\[Your Name\]/g, 'Your Name');
      }
      
      console.log('📧 Using edited content from rich text editor (preserves user formatting)');
      console.log('📧 Final content for message:', finalContent);
      console.log('📧 Final content length:', finalContent.length);
      console.log('📧 Has HTML tags:', /<[^>]*>/g.test(finalContent));
      console.log('📧 Has Quill classes:', /ql-align/.test(finalContent));
      console.log('📧 ===== END CONTENT FLOW DEBUG =====');
      
      const messageData = {
        title: data.title,
        content: finalContent,
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
        // Include background color for email styling
        backgroundColor: templateBackgroundColor,
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
      
      // Force refresh the messages list to show the new scheduled message
      window.dispatchEvent(new CustomEvent('messageStatusUpdated'));
      
      // Don't close dialog, just reset form for next message
      resetFormState();
    } catch (err) {
      console.error('Failed to create message:', err);
      // Show user-friendly error message
      alert(`Failed to create message: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Re-throw error so calling function can handle it
      throw err;
    }
  };

  const onSubmitAndClose = async (data: MessageForm) => {
    try {
      await onSubmit(data);
      // Only close dialog if submission was successful
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create message and close:', err);
      // Show user-friendly error message
      alert(`Failed to create message: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Don't close dialog on error - let user see the error and try again
    }
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
    setOriginalTemplateContent('');
    setTemplateBackgroundColor('#ffffff'); // Reset to white
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
              <div className="flex items-center justify-between">
                <Label>Video</Label>
              </div>
              <div className="">
                <div className="w-[240px] h-[180px] bg-black rounded mb-3 overflow-hidden mx-auto">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    controls={!isRecording}
                    muted={isRecording}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isRecording ? (
                    <>
                      <Button type="button" onClick={() => { setIsVideoRecordModalOpen(true); }} variant="outline">
                        <Video className="h-4 w-4 mr-2" />
                        Record New Video
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsVideoSelectionOpen(true)}>
                        Get video from library
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={stopRecording} variant="destructive">
                      <Square className="h-4 w-4 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                  {(recordedBlob || selectedVideoUrl) && (
                    <Button type="button" variant="ghost" onClick={() => {
                      setRecordedBlob(null);
                      setRecordingUrl(null);
                      setSelectedVideoUrl(null);
                      setSelectedVideoTitle('');
                      if (videoRef.current) {
                        (videoRef.current as any).srcObject = null;
                        videoRef.current.src = '';
                      }
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
              <div className="flex items-center justify-between">
                <Label>Voice Recording</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAudioSelectionOpen(true)}
                >
                  Browse Audio
                </Button>
              </div>
              <div>
                {(recordingUrl || selectedAudioUrl) && (
                  <audio src={recordingUrl || selectedAudioUrl || ''} controls className="w-full mb-3" />
                )}
                <div className="flex space-x-2">
                  {!isRecording ? (
                    <Button type="button" onClick={() => setIsAudioRecordModalOpen(true)} variant="outline">
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
              <div className="flex items-center justify-between">
                <Label>File Attachments</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsFileSelectionOpen(true)}>Browse Files</Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
              </div>
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
          )}

          {/* Guardian Angel Protection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-red-400" />
                  Guardian Angel Protection
                </Label>
                <p className="text-sm text-muted-foreground">
                  This message will be automatically sent if you miss your regular check-ins
                </p>
              </div>
              <Switch
                checked={isDmsProtected}
                onCheckedChange={(checked) => {
                  setIsDmsProtected(checked);
                  if (checked) {
                    // Automatically open activation dialog when toggled ON
                    setShowDmsActivation(true);
                  }
                }}
              />
            </div>
            {isDmsProtected && (
              <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-red-200">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    <span className="font-medium text-sm">Guardian Angel Protected Message</span>
                  </div>
                </div>
                <p className="text-red-300 text-xs">
                  This message will be sent automatically if you fail to check in according to your Guardian Angel configuration.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDmsActivation(true)}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500 hover:border-yellow-600 font-semibold"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Activate Guardian Angel
                </Button>
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
            
            {/* Background Color Picker - Only show for rich text */}
            {useRichText && (
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="background-color" className="text-sm font-medium text-gray-700">
                  Background Color:
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="background-color"
                    value={templateBackgroundColor}
                    onChange={(e) => setTemplateBackgroundColor(e.target.value)}
                    className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                  />
                  <span className="text-xs text-gray-600 font-mono">
                    {templateBackgroundColor}
                  </span>
                </div>
              </div>
            )}
            
            {useRichText ? (
              <div 
                className="min-h-[200px] rounded-lg border overflow-hidden"
                style={{ backgroundColor: templateBackgroundColor }}
              >
                <RichTextEditor
                  value={watch('content') || ''}
                  onChange={(value) => {
                    console.log('RichTextEditor onChange:', value);
                    setValue('content', value);
                  }}
                  placeholder={
                    selectedTypes.includes('EMAIL') ? 'Compose your message...' :
                    selectedTypes.includes('VIDEO') && selectedTypes.includes('VOICE') ? 'Add rich notes for video and voice...' :
                    selectedTypes.includes('VIDEO') ? 'Add rich description or script for the video...' :
                    selectedTypes.includes('VOICE') ? 'Add rich notes for the voice message...' :
                    'Describe the files with rich text...'
                  }
                  className="min-h-[200px]"
                />
              </div>
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
                    className="text-xs h-6 px-2 text-muted-foreground hover:text-red-500"
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
                        className="w-full text-gray-300 hover:text-red-300 hover:bg-gray-700"
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
            watch('recipients') && watch('recipients').length > 0
              ? recipients.find(r => r.id === watch('recipients')[0])?.name || "Recipient"
              : "Recipient"
          }
          senderName="Your Name"
          backgroundColor={templateBackgroundColor}
        />
        
        <DmsActivationDialog
          open={showDmsActivation}
          onOpenChange={setShowDmsActivation}
          onActivate={async (config) => {
            // Persist DMS configuration to Supabase and create cycle
            if (!user) { 
              console.warn('No authenticated user; cannot activate DMS'); 
              alert('Please log in to activate Guardian Angel');
              return; 
            }
            
            try {
              const freqUnit = (config as any).frequencyUnit || 'days';
              const graceUnit = (config as any).graceUnit || 'days';
              const mult = freqUnit === 'minutes' ? 60*1000 : freqUnit === 'hours' ? 60*60*1000 : 24*60*60*1000;
              const next = new Date(Date.now() + (config.frequencyDays || 7) * mult);
              
              // Use camelCase for database columns
              const saved = await DmsService.upsertConfig({
                userId: user.id, // camelCase
                frequencyDays: config.frequencyDays,
                frequencyUnit: freqUnit, // camelCase
                graceDays: config.graceDays,
                graceUnit: graceUnit, // camelCase
                durationDays: config.durationDays,
                checkInReminderHours: config.checkInReminderHours,
                channels: config.channels,
                status: 'ACTIVE',
                startDate: new Date().toISOString(), // camelCase
                endDate: new Date(Date.now() + (config.durationDays || 30) * 24 * 60 * 60 * 1000).toISOString(), // camelCase
                nextCheckin: next.toISOString(), // camelCase
              } as any);
              
              if (saved) {
                await DmsService.upsertCycle({
                  configId: saved.id, // camelCase
                  userId: user.id, // camelCase
                  nextCheckinAt: next.toISOString(), // camelCase
                  state: 'ACTIVE',
                  reminders: [1,3,7],
                  checkInReminderSent: false, // camelCase
                } as any);
                
                console.log('✅ Guardian Angel activated successfully!', saved);
                toast({
                  title: (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span>Guardian Angel Activated!</span>
                    </div>
                  ),
                  description: `Check in every ${config.frequencyDays} ${freqUnit}.`,
                  className: "bg-green-50 border-green-200",
                });
              }
            } catch (error) {
              console.error('Error activating Guardian Angel:', error);
              toast({
                title: (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <span>Activation Failed</span>
                  </div>
                ),
                description: "Failed to activate Guardian Angel. Please check the console for details.",
                variant: "destructive",
              });
            }
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

        {/* Audio Recording Modal */}
        <Dialog open={isAudioRecordModalOpen} onOpenChange={(o) => {
          setIsAudioRecordModalOpen(o);
          if (!o) {
            if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
            setIsRecording(false);
          }
        }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Record Audio</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="bg-black/30 p-3 rounded">
                <audio ref={audioModalRef} controls className="w-full" />
              </div>
              <div className="flex justify-between">
                <div className="flex gap-2">
                  {!isRecording ? (
                    <Button onClick={startAudioRecording}>Start Recording</Button>
                  ) : (
                    <Button variant="destructive" onClick={stopRecording}>Stop Recording</Button>
                  )}
                </div>
                <Button variant="outline" onClick={() => setIsAudioRecordModalOpen(false)}>Close</Button>
              </div>
              {recordedBlob && (
                <div className="flex items-center justify-end gap-2">
                  <Button variant="destructive" onClick={() => { setRecordedBlob(null); setRecordingUrl(null); if (audioModalRef.current) audioModalRef.current.src = ''; }}>Retake</Button>
                  <Button onClick={() => { setAudioNameInput(watch('title') || 'My audio'); setIsAudioNameDialogOpen(true); }} className="bg-green-600 hover:bg-green-700">Save & Close</Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Name Audio Dialog */}
        <Dialog open={isAudioNameDialogOpen} onOpenChange={setIsAudioNameDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Name Your Audio</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="audio-name-input">File name</Label>
              <Input id="audio-name-input" value={audioNameInput} onChange={(e) => setAudioNameInput(e.target.value)} placeholder="Enter a name…" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAudioNameDialogOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  try {
                    if (!recordedBlob) return;
                    const base = (audioNameInput || 'audio').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 50);
                    const filename = `${base}-${Date.now()}.webm`;
                    const res = await MediaService.uploadAudio(recordedBlob as Blob, filename);
                    setSelectedAudioUrl(res.url);
                    setSelectedAudioTitle(audioNameInput || filename);
                    setRecordedBlob(null);
                    setRecordingUrl(null);
                    setIsAudioNameDialogOpen(false);
                    setIsAudioRecordModalOpen(false);
                    try { window.dispatchEvent(new CustomEvent('mediaUploaded', { detail: { kind: 'audio', path: res.path, url: res.url, title: audioNameInput || filename, createdAt: new Date().toISOString() } })); } catch {}
                  } catch (e) {
                    alert('Failed to save audio');
                  }
                }}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <FileSelectionDialog
          open={isFileSelectionOpen}
          onOpenChange={setIsFileSelectionOpen}
          onSelectFile={(url, name) => {
            const current = watch('content') || '';
            const safe = name.replace(/[`]/g, '');
            setValue('content', `${current}\n<a href="${url}" target="_blank" rel="noopener noreferrer">${safe}</a>`);
          }}
        />

        {/* Video Recording Modal - preview first, then start */}
        <Dialog open={isVideoRecordModalOpen} onOpenChange={(o) => {
          setIsVideoRecordModalOpen(o);
          if (!o) {
            // cleanup
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(t => t.stop());
              streamRef.current = null;
            }
            setIsRecording(false);
          }
        }}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Record Video</DialogTitle>
            </DialogHeader>
            <div className="w-full h-[60vh] bg-black relative flex items-center justify-center">
              <video
                ref={modalVideoRef}
                className="w-full h-full object-contain"
                autoPlay
                muted
                playsInline
              />
              {!isRecording && !recordedBlob && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Button onClick={startRecording} className="pointer-events-auto bg-red-500 hover:bg-red-600 px-6 py-6 text-base">Start Recording</Button>
                </div>
              )}
              {recordedBlob && (
                <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={() => { try { (modalVideoRef.current as any)?.play?.(); } catch {} }}>Play</Button>
                  <Button variant="outline" onClick={() => { try { (modalVideoRef.current as any)?.pause?.(); (modalVideoRef.current as any).currentTime = 0; } catch {} }}>Rewind</Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      // Ask for a name before saving
                      setVideoNameInput(watch('title') || 'My video');
                      setIsVideoNameDialogOpen(true);
                    }}
                  >Save & Close</Button>
                  <Button variant="destructive" onClick={() => { setRecordedBlob(null); setRecordingUrl(null); }}>Retake</Button>
                </div>
              )}
            </div>
            <div className="flex justify-between pt-2">
              <div>
                {isRecording && (
                  <Button variant="destructive" onClick={stopRecording}>Stop Recording</Button>
                )}
              </div>
              <Button variant="outline" onClick={() => setIsVideoRecordModalOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Name Video Dialog */}
        <Dialog open={isVideoNameDialogOpen} onOpenChange={setIsVideoNameDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Name Your Video</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="video-name-input">File name</Label>
              <Input
                id="video-name-input"
                value={videoNameInput}
                onChange={(e) => setVideoNameInput(e.target.value)}
                placeholder="Enter a name…"
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setIsVideoNameDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    try {
                      if (!recordedBlob) return;
                      const baseTitle = (videoNameInput || 'video')
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '')
                        .slice(0, 50);
                      const filename = `${baseTitle}-${Date.now()}.webm`;
                      const res = await MediaService.uploadVideo(recordedBlob as Blob, filename);
                      setSelectedVideoUrl(res.url);
                      setSelectedVideoTitle(videoNameInput || filename);
                      if (videoRef.current) {
                        videoRef.current.srcObject = null;
                        videoRef.current.src = res.url;
                      }
                      setRecordedBlob(null);
                      setRecordingUrl(null);
                      setIsVideoNameDialogOpen(false);
                      setIsVideoRecordModalOpen(false);
                      try {
                        window.dispatchEvent(new CustomEvent('mediaUploaded', { detail: { kind: 'video', path: res.path, url: res.url, title: videoNameInput || filename, createdAt: new Date().toISOString() } }));
                      } catch {}
                    } catch (e) {
                      alert('Failed to save video');
                    }
                  }}
                >Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}