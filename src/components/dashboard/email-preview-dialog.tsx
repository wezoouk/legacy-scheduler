import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Mail, Smartphone, Monitor, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  content: string;
  recipientName?: string;
  senderName?: string;
  message?: any; // Full message object for attachments
}

export function EmailPreviewDialog({ 
  open, 
  onOpenChange, 
  subject, 
  content, 
  recipientName = "[Recipient Name]",
  senderName = "[Your Name]",
  message
}: EmailPreviewDialogProps) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showRawHtml, setShowRawHtml] = useState(false);

  // Process content to replace placeholders
  const processedContent = content
    .replace(/\[Name\]/g, recipientName)
    .replace(/\[Your Name\]/g, senderName);

  const processedSubject = subject
    .replace(/\[Name\]/g, recipientName)
    .replace(/\[Your Name\]/g, senderName);

  // Check if content is already HTML or plain text
  const isHtmlContent = /<[^>]*>/g.test(content);

  // Generate attachment HTML
  const generateAttachmentHtml = () => {
    if (!message) return '';
    
    let attachmentHtml = '';
    
    // Video attachment - embedded player (only when message type includes VIDEO)
    const hasVideoType = Array.isArray(message.types) && message.types.includes('VIDEO');
    if (hasVideoType && (message.videoRecording || (message.cipherBlobUrl && /\.(mp4|webm|mov)(\?|$)/i.test(message.cipherBlobUrl)))) {
      const videoUrl = message.cipherBlobUrl || message.videoRecording;
      attachmentHtml += `
        <div style="margin: 20px 0; padding: 16px; background: #f3f4f6; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">📹 Video Message</h4>
          <div style="margin: 12px 0;">
            <video controls style="width: 100%; max-width: 400px; border-radius: 8px;" preload="metadata">
              <source src="${videoUrl}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>
          <div style="margin: 12px 0; padding: 12px; background: #ffffff; border-radius: 6px; border: 1px solid #d1d5db;">
            <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 500;">📺 Watch Video Online</p>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">Click the link below to view the video message:</p>
            <a href="${videoUrl}" style="color: #3b82f6; text-decoration: underline; font-size: 14px; font-weight: 500;" target="_blank">
              ▶️ Play Video Message
            </a>
            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">If the video doesn't play above, click the link to open it in your browser.</p>
          </div>
        </div>
      `;
    }
    
    // Audio attachment
    if (message.audioRecording) {
      attachmentHtml += `
        <div style="margin: 20px 0; padding: 16px; background: #f3f4f6; border-radius: 8px; border-left: 4px solid #10b981;">
          <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">🎵 Audio Message</h4>
          <audio controls style="width: 100%;">
            <source src="${message.audioRecording}" type="audio/mpeg">
            Your browser does not support the audio tag.
          </audio>
          <div style="margin: 12px 0; padding: 12px; background: #ffffff; border-radius: 6px; border: 1px solid #d1d5db;">
            <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 500;">🎧 Listen to Audio Online</p>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">Click the link below to play the audio message:</p>
            <a href="${message.audioRecording}" style="color: #10b981; text-decoration: underline; font-size: 14px; font-weight: 500;" target="_blank">
              ▶️ Play Audio Message
            </a>
            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">If the audio doesn't play above, click the link to open it in your browser.</p>
          </div>
        </div>
      `;
    }
    
    // File attachments
    if (message.attachments && message.attachments.length > 0) {
      attachmentHtml += `
        <div style="margin: 20px 0; padding: 16px; background: #f3f4f6; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <h4 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">📎 Attachments</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${message.attachments.map((file: any) => `
              <li style="color: #374151; font-size: 14px; margin-bottom: 4px;">
                📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }
    
    return attachmentHtml;
  };

  // Create email HTML with proper structure
  const emailHtml = isHtmlContent ? processedContent : `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 8px;">
      <div style="padding: 32px;">
        <h1 style="color: #1f2937; font-size: 24px; font-weight: bold; margin-bottom: 16px;">${processedSubject}</h1>
        <div style="color: #374151; font-size: 16px; line-height: 1.6;">
          ${processedContent.replace(/\n/g, '<br>')}
        </div>
        ${generateAttachmentHtml()}
      </div>
      <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; margin: 0;">
          This message was sent through Legacy Scheduler
        </p>
      </div>
    </div>
  `;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(emailHtml);
    alert('Email HTML copied to clipboard!');
  };

  const openInNewWindow = () => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Preview - ${processedSubject}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 20px; background: #f3f4f6; font-family: Arial, sans-serif; }
            .email-container { max-width: 600px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="email-container">
            ${emailHtml}
          </div>
        </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Email Preview
            </DialogTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant={previewMode === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('desktop')}
              >
                <Monitor className="w-3 h-3 mr-1" />
                Desktop
              </Button>
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('mobile')}
              >
                <Smartphone className="w-3 h-3 mr-1" />
                Mobile
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-[70vh]">
          {/* Email Header */}
          <div className="bg-gray-50 border rounded-t-lg p-4 border-b-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Email Preview</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRawHtml(!showRawHtml)}
                  >
                    {showRawHtml ? 'Show Preview' : 'Show HTML'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy HTML
                  </Button>
                  <Button variant="ghost" size="sm" onClick={openInNewWindow}>
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open in New Tab
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">From:</span>
                  <div className="text-gray-600">Legacy Scheduler &lt;noreply@legacyscheduler.com&gt;</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">To:</span>
                  <div className="text-gray-600">{recipientName} &lt;recipient@example.com&gt;</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Subject:</span>
                  <div className="text-gray-600">{processedSubject}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div className="flex-1 bg-white border-x border-b rounded-b-lg overflow-hidden">
            {showRawHtml ? (
              <div className="h-full overflow-y-auto p-4">
                <pre className="text-xs bg-gray-50 p-4 rounded border overflow-x-auto">
                  <code>{emailHtml}</code>
                </pre>
              </div>
            ) : (
              <div className="h-full overflow-y-auto bg-gray-100 p-4">
                <div 
                  className={`mx-auto bg-white shadow-sm ${
                    previewMode === 'mobile' ? 'max-w-xs' : 'max-w-2xl'
                  }`}
                  style={{ minHeight: '400px' }}
                >
                  <iframe
                    className="w-full h-full border-0"
                    style={{ minHeight: '500px' }}
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Email Preview</title>
                      </head>
                      <body style="margin: 0; padding: 0; background: #f9fafb;">
                        ${emailHtml}
                      </body>
                      </html>
                    `}
                    title="Email Preview"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {isHtmlContent ? 'Rich HTML Content' : 'Plain Text Content'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {previewMode === 'mobile' ? 'Mobile View' : 'Desktop View'}
            </Badge>
          </div>
          <Button onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}