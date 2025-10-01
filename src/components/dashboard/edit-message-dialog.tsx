import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { EmailTemplateSelector } from "@/components/dashboard/email-template-selector";
import { EmailPreviewDialog } from "@/components/dashboard/email-preview-dialog";
import { type EmailTemplate } from "@/lib/email-templates";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomCalendar } from "@/components/ui/custom-calendar";
import { CustomTimePicker } from "@/components/ui/custom-time-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useRecipients } from "@/lib/use-recipients";
import { CalendarIcon, Video, Mic, Upload, X, Play, Pause, Trash2, Mail, FileText, Sparkles, Type, Shield, Eye } from "lucide-react";
import { format } from "date-fns";
import { DmsActivationDialog } from "./dms-activation-dialog";

interface EditMessageDialogProps {
  message: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (message: any) => void;
}

export function EditMessageDialog({ message, open, onOpenChange, onSave }: EditMessageDialogProps) {
  const { recipients } = useRecipients();
  const [title, setTitle] = useState(message?.title || '');
  const [content, setContent] = useState(message?.content || '');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(message?.types || message?.type ? [message.type] : ['EMAIL']);
  const [selectedRecipients, setSelectedRecipients] = useState(message?.recipientIds || []);
  const [scheduledDate, setScheduledDate] = useState(
    message?.scheduledFor ? new Date(message.scheduledFor) : undefined
  );
  const [scheduledTime, setScheduledTime] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [useRichText, setUseRichText] = useState(false);
  const [isUsingTemplate, setIsUsingTemplate] = useState(false);
  const [videoRecording, setVideoRecording] = useState<Blob | null>(null);
  const [audioRecording, setAudioRecording] = useState<Blob | null>(null);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string>(message?.cipherBlobUrl || message?.videoRecording || '');
  const [existingAudioUrl, setExistingAudioUrl] = useState<string>(message?.audioRecording || '');
  const [attachments, setAttachments] = useState<File[]>(message?.attachments || []);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [videoURL, setVideoURL] = useState<string>('');
  const [audioURL, setAudioURL] = useState<string>('');

  // Add missing state for DMS protection
  const [isDmsProtected, setIsDmsProtected] = useState(message?.scope === 'DMS' || false);
  const [showDmsActivation, setShowDmsActivation] = useState(false);

  // Initialize all fields when message changes
  useEffect(() => {
    if (message) {
      setTitle(message.title || '');
      setContent(message.content || '');
      setSelectedRecipients(message.recipientIds || []);
      setExistingVideoUrl(message.cipherBlobUrl || message.videoRecording || '');
      setExistingAudioUrl(message.audioRecording || '');
      setAttachments(message.attachments || []);
      setIsDmsProtected(message.scope === 'DMS' || false);
      
      const messageTypes = message.types || (message.type ? [message.type] : ['EMAIL']);
      setSelectedTypes(messageTypes);
      
      // Detect if content is HTML (rich text)
      const hasHtmlTags = /<[^>]*>/g.test(message.content || '');
      setUseRichText(hasHtmlTags && messageTypes.includes('EMAIL'));
      
      // Reset template flag
      setIsUsingTemplate(false);
    }
  }, [message]);
  
  useEffect(() => {
    if (message?.scheduledFor) {
      const date = new Date(message.scheduledFor);
      setScheduledTime(format(date, 'HH:mm'));
    }
  }, [message]);

  useEffect(() => {
    if (videoRecording && videoRecording instanceof Blob) {
      const url = URL.createObjectURL(videoRecording);
      setVideoURL(url);
      return () => URL.revokeObjectURL(url);
    } else if (existingVideoUrl) {
      setVideoURL(existingVideoUrl);
    } else {
      setVideoURL('');
    }
  }, [videoRecording, existingVideoUrl]);

  useEffect(() => {
    if (audioRecording && audioRecording instanceof Blob) {
      const url = URL.createObjectURL(audioRecording);
      setAudioURL(url);
      return () => URL.revokeObjectURL(url);
    } else if (existingAudioUrl) {
      setAudioURL(existingAudioUrl);
    } else {
      setAudioURL('');
    }
  }, [audioRecording, existingAudioUrl]);

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setVideoStream(stream);
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoRecording(blob);
        stream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingVideo(true);
    } catch (err) {
      console.error('Error starting video recording:', err);
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioRecording(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingAudio(true);
    } catch (err) {
      console.error('Error starting audio recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecordingVideo(false);
      setIsRecordingAudio(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const toggleRecipient = (recipient: any) => {
    const exists = selectedRecipients.includes(recipient.id);
    if (exists) {
      setSelectedRecipients(selectedRecipients.filter((id: string) => id !== recipient.id));
    } else {
      setSelectedRecipients([...selectedRecipients, recipient.id]);
    }
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    // Get selected recipient names
    const selectedRecipientNames = selectedRecipients
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
      .replace(/\[Name\]/g, recipientName)
      .replace(/\[Your Name\]/g, 'Your Name');
      
    const processedContent = template.content
      .replace(/\[Name\]/g, recipientName)
      .replace(/\[Your Name\]/g, 'Your Name');
    
    setTitle(processedSubject);
    setContent(processedContent);
    setUseRichText(true);
    setIsUsingTemplate(true);
    setShowTemplates(false);
  };

  const handleSave = async () => {
    let scheduledFor = undefined;
    if (scheduledDate && scheduledTime) {
      const [hours, minutes] = scheduledTime.split(':');
      // Create date in local timezone, then convert to UTC properly
      const localDate = new Date(scheduledDate);
      localDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      scheduledFor = localDate.toISOString();
    }

    // Convert Blobs to data URLs for storage, or preserve existing URLs
    let videoData = existingVideoUrl || null;
    let audioData = existingAudioUrl || null;

    if (videoRecording instanceof Blob) {
      videoData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(videoRecording);
      });
    }

    if (audioRecording instanceof Blob) {
      audioData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(audioRecording);
      });
    }
    console.log('Saving message with data:', {
      title,
      content,
      types: selectedTypes,
      recipientIds: selectedRecipients,
      scheduledFor,
      scope: isDmsProtected ? 'DMS' : 'NORMAL',
      status: scheduledFor ? 'SCHEDULED' : 'DRAFT'
    });
    const updatedMessage = {
      ...message,
      title,
      content,
      types: selectedTypes,
      recipientIds: selectedRecipients,
      scheduledFor,
     scope: isDmsProtected ? 'DMS' : 'NORMAL',
      videoRecording: videoData,
      audioRecording: audioData,
      attachments,
      status: scheduledFor ? 'SCHEDULED' : 'DRAFT',
      updatedAt: new Date().toISOString()
    };

    console.log('Updated message object:', updatedMessage);
    onSave(updatedMessage);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Message title"
            />
          </div>

          <div className="space-y-3">
            <Label>Message Types (select multiple)</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'EMAIL', icon: Mail, label: 'Email', description: 'Send via email' },
                { id: 'VIDEO', icon: Video, label: 'Video', description: 'Record or attach video' },
                { id: 'VOICE', icon: Mic, label: 'Voice', description: 'Record audio message' },
                { id: 'FILE', icon: FileText, label: 'File', description: 'Attach documents or files' },
              ].map((type) => {
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
                      if (selectedTypes.includes(type.id)) {
                        setSelectedTypes(selectedTypes.filter(t => t !== type.id));
                      } else {
                        setSelectedTypes([...selectedTypes, type.id]);
                      }
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
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
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
                {selectedTypes.includes('EMAIL') && content && (
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
                    if (useRichText) {
                      // If switching from rich text to plain text, strip HTML tags
                      const div = document.createElement('div');
                      div.innerHTML = content;
                      const plainText = div.textContent || div.innerText || '';
                      setContent(plainText);
                      setIsUsingTemplate(false);
                    }
                    setUseRichText(!useRichText);
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
                value={content}
                onChange={setContent}
                placeholder="Compose your beautiful email message..."
                className="min-h-[200px]"
              />
            ) : (
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Your message content..."
                rows={4}
              />
            )}
          </div>

          {/* Video Recording */}
          {selectedTypes.includes('VIDEO') && (
            <div>
              <Label>Video Recording</Label>
              <div className="space-y-2">
                {videoStream && (
                  <video
                    ref={(video) => {
                      if (video && videoStream) {
                        video.srcObject = videoStream;
                      }
                    }}
                    autoPlay
                    muted
                    className="w-full max-w-md rounded border"
                  />
                )}
                {videoURL && !videoStream && (
                  <video src={videoURL} controls className="w-full max-w-md rounded border" />
                )}
                <div className="flex gap-2">
                  {!isRecordingVideo ? (
                    <Button onClick={startVideoRecording} size="sm">
                      <Video className="h-4 w-4 mr-2" />
                      Record Video
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} size="sm" variant="destructive">
                      <Pause className="h-4 w-4 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                  {(videoRecording || existingVideoUrl) && (
                    <Button onClick={() => {
                      setVideoRecording(null);
                      setExistingVideoUrl('');
                      setVideoURL('');
                    }} size="sm" variant="outline">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Audio Recording */}
          {selectedTypes.includes('VOICE') && (
            <div>
              <Label>Audio Recording</Label>
              <div className="space-y-2">
                {audioURL && <audio src={audioURL} controls className="w-full" />}
                <div className="flex gap-2">
                  {!isRecordingAudio ? (
                    <Button onClick={startAudioRecording} size="sm">
                      <Mic className="h-4 w-4 mr-2" />
                      Record Audio
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} size="sm" variant="destructive">
                      <Pause className="h-4 w-4 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                  {(audioRecording || existingAudioUrl) && (
                    <Button onClick={() => {
                      setAudioRecording(null);
                      setExistingAudioUrl('');
                      setAudioURL('');
                    }} size="sm" variant="outline">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* File Upload */}
          {selectedTypes.includes('FILE') && (
            <div>
              <Label>Attachments</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    onClick={() => document.getElementById('file-upload')?.click()}
                    size="sm"
                    variant="outline"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                </div>
                {attachments.length > 0 && (
                  <div className="space-y-1">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{file.name}</span>
                        <Button
                          onClick={() => removeAttachment(index)}
                          size="sm"
                          variant="ghost"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <Label>Recipients</Label>
            <div className="max-h-32 overflow-y-auto border rounded p-2">
              {recipients.map((recipient) => (
                <div key={recipient.id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedRecipients.includes(recipient.id)}
                    onChange={() => toggleRecipient(recipient)}
                  />
                  <span className="text-sm">{recipient.name}</span>
                </div>
              ))}
            </div>
            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedRecipients.map((recipientId: string) => {
                  const recipient = recipients.find(r => r.id === recipientId);
                  return (
                  <Badge key={recipientId} variant="secondary">
                    {recipient?.name || 'Unknown'}
                  </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Guardian Angel Protection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-red-600" />
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
                    // Open activation dialog to configure DMS settings
                    setShowDmsActivation(true);
                  }
                }}
              />
            </div>
            {isDmsProtected && (
              <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-red-300">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    <span className="font-medium text-sm">Guardian Angel Protected Message</span>
                  </div>
                </div>
                <p className="text-red-400 text-xs">
                  This message will be sent automatically if you fail to check in according to your Guardian Angel configuration.
                </p>
                <p className="text-yellow-400 text-xs italic">
                  ⚠️ To change Guardian Angel settings, go to the Guardian Angel page.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Schedule Date</Label>
                {(scheduledDate || scheduledTime) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setScheduledDate(undefined);
                      setScheduledTime('');
                    }}
                    className="text-xs h-6 px-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-black">
                  <CustomCalendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
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
                        setScheduledDate(today);
                        if (!scheduledTime) {
                          setScheduledTime('12:00');
                        }
                      }}
                    >
                      Choose Today
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-gray-300 hover:text-red-400 hover:bg-gray-700"
                      onClick={() => {
                        setScheduledDate(undefined);
                        setScheduledTime('');
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Remove Date
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="time">Schedule Time</Label>
              <CustomTimePicker
                value={scheduledTime}
                onChange={setScheduledTime}
                disabled={!scheduledDate}
                placeholder="Select time"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Message
          </Button>
        </DialogFooter>
        
        <EmailTemplateSelector
          open={showTemplates}
          onOpenChange={setShowTemplates}
          onSelectTemplate={handleTemplateSelect}
        />
        
        <EmailPreviewDialog
          open={showEmailPreview}
          onOpenChange={setShowEmailPreview}
          subject={title || 'Your Message Subject'}
          content={content || ''}
          recipientName={
            selectedRecipients.length > 0
              ? recipients.find(r => r.id === selectedRecipients[0])?.name || "Recipient"
              : "Recipient"
          }
          senderName="Your Name"
        />
        
        <DmsActivationDialog
          open={showDmsActivation}
          onOpenChange={setShowDmsActivation}
          onActivate={async (config) => {
            console.log('DMS config activated for edit:', config);
            setIsDmsProtected(true);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}