import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, User, MessageSquare, Video, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface VideoViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  senderName?: string;
  messageTitle?: string;
  messageContent?: string;
  sentAt?: string;
  recipientName?: string;
}

export function VideoViewerModal({
  open,
  onOpenChange,
  videoUrl,
  senderName = "Unknown Sender",
  messageTitle = "Video Message",
  messageContent = "",
  sentAt,
  recipientName = "Recipient"
}: VideoViewerModalProps) {
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `video-message-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(videoUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Message
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Video Player */}
          <div className="flex-1 bg-black rounded-lg overflow-hidden mb-4">
            <video
              src={videoUrl}
              controls
              className="w-full h-full object-contain"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Message Details */}
          <Card className="flex-shrink-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{senderName}</span>
                  <Badge variant="outline" className="text-xs">
                    Sender
                  </Badge>
                </div>
                {sentAt && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <CalendarIcon className="h-3 w-3" />
                    {format(new Date(sentAt), 'MMM d, yyyy • h:mm a')}
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Message Title */}
              <div>
                <h3 className="font-semibold text-lg mb-2">{messageTitle}</h3>
              </div>

              {/* Message Content */}
              {messageContent && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">Message:</span>
                  </div>
                  <div 
                    className="prose prose-sm max-w-none p-3 bg-gray-50 rounded-lg border text-gray-900"
                    style={{ color: '#1f2937 !important' }}
                    dangerouslySetInnerHTML={{ 
                      __html: messageContent.replace(/\n/g, '<br>') 
                    }}
                  />
                </div>
              )}

              {/* Recipient Info */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>To:</span>
                <Badge variant="secondary">{recipientName}</Badge>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="h-3 w-3" />
                  Download Video
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInNewTab}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in New Tab
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
